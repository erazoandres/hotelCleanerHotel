// ==============================================================================
// ADAPTADOR DE DATOS: SUPABASE <-> MEMORY STATE (MULTI-USUARIO & REALTIME)
// ==============================================================================

window.HotelDB = (function() {
  "use strict";

  function getClient() {
    return window.sbClient || (window.parent && window.parent.sbClient) || null;
  }

  function updateConnectionBadge(status, label) {
    const badge = document.getElementById("supabase-status-badge");
    if (!badge) return;
    if (status === "connected") {
      badge.className = "mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400/90 tracking-wide transition-all";
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot-pulse"></span><span class="tracking-tight">BD Conectada</span>';
    } else if (status === "error") {
      badge.className = "mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-400/80 tracking-wide transition-all";
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span><span class="tracking-tight">Sin conexión</span>';
    } else {
      badge.className = "mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7fa3a6]/80 tracking-wide transition-all";
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-[#7fa3a6]/60"></span><span class="tracking-tight">Modo Local</span>';
    }
  }

  const statusToDatabase = {
    free: "libre",
    occupied: "ocupada",
    pending: "pendiente",
    cleaning: "limpieza",
    finished: "finalizado"
  };
  const statusFromDatabase = Object.fromEntries(
    Object.entries(statusToDatabase).map(([appStatus, databaseStatus]) => [databaseStatus, appStatus])
  );
  // 1. CARGA INICIAL DESDE SUPABASE
  async function fetchRemoteState() {
    const sb = getClient();
    if (!sb) {
      updateConnectionBadge("local");
      return null;
    }

    try {
      const [
        { data: rooms, error: errRooms },
        { data: staff, error: errStaff },
        { data: roomAssignments, error: errAssignments },
        { data: events, error: errEvents },
        { data: cleaningWork, error: errWork },
        { data: attendance, error: errAtt },
        { data: novelties, error: errNov }
      ] = await Promise.all([
        sb.from("habitaciones").select("*"),
        sb.from("personal").select("id_personal, nombre, contacto, activo, creado_en").eq("activo", true),
        sb.from("asignaciones_habitacion").select("*").order("asignado_en", { ascending: false }),
        sb.from("eventos").select("*").order("creado_en", { ascending: false }).limit(100),
        sb.from("trabajos_limpieza").select("*").order("creado_en", { ascending: false }),
        sb.from("asistencias").select("*"),
        sb.from("novedades").select("*").order("creado_en", { ascending: false })
      ]);

      const queryError = errRooms || errStaff || errAssignments || errEvents || errWork || errAtt || errNov;
      if (queryError) {
        console.error("[HotelDB] Error obteniendo datos remotos.", queryError);
        updateConnectionBadge("error");
        return null;
      }

      updateConnectionBadge("connected");
      const staffById = new Map((staff || []).map(person => [person.id_personal, person]));

      // Convertir formato relacional de Supabase al formato en memoria que espera app.js
      const roomsObj = {};
      const guestsObj = {};
      const servicePlansObj = {};
      const cleaningDetailsObj = {};
      const assignedCleaningsObj = {};

      (rooms || []).forEach(r => {
        const status = statusFromDatabase[r.estado];
        roomsObj[r.id_habitacion] = status || "unknown";
        if (r.nombre_huesped) guestsObj[r.id_habitacion] = r.nombre_huesped;
        if (r.plan_limpieza) servicePlansObj[r.id_habitacion] = r.plan_limpieza;
        if (r.detalles_limpieza) cleaningDetailsObj[r.id_habitacion] = r.detalles_limpieza;
        if (r.id_personal_asignado) {
          assignedCleaningsObj[r.id_habitacion] = {
            staffId: r.id_personal_asignado,
            staffName: staffById.get(r.id_personal_asignado)?.nombre || "",
            cleaningType: r.tipo_limpieza_asignada || ""
          };
        }
      });

      const formattedRoomAssignments = (roomAssignments || []).map(assignment => ({
        id: assignment.id_asignacion,
        roomId: assignment.id_habitacion,
        staffId: assignment.id_personal,
        cleaningType: assignment.tipo_limpieza,
        assignedAt: assignment.asignado_en,
        unassignedAt: assignment.liberado_en
      }));

      const formattedEvents = (events || []).map(e => ({
        room: e.id_habitacion,
        status: statusFromDatabase[e.estado] || "unknown",
        action: e.accion,
        guest: e.nombre_huesped,
        actor: e.responsable,
        cleanerId: e.id_personal,
        cleaningType: e.tipo_limpieza,
        time: e.creado_en
      }));

      const formattedCleaningWork = (cleaningWork || []).map(w => ({
        staffId: w.id_personal,
        staffName: w.nombre_personal,
        room: w.id_habitacion,
        cleaningType: w.tipo_limpieza,
        time: w.creado_en
      }));

      const formattedAttendance = (attendance || []).map(a => ({
        id: a.id_asistencia,
        staffId: a.id_personal,
        staffName: a.nombre_personal,
        checkIn: a.entrada,
        checkOut: a.salida
      }));

      const formattedNovelties = (novelties || []).map(n => ({
        id: n.id_novedad,
        staffId: n.id_personal,
        staffName: n.nombre_personal,
        date: n.fecha,
        type: n.tipo,
        label: n.etiqueta,
        notes: n.notas || "",
        extraMinutes: n.minutos_extra ?? null,
        createdAt: n.creado_en
      }));

      return {
        rooms: roomsObj,
        guests: guestsObj,
        servicePlans: servicePlansObj,
        cleaningDetails: cleaningDetailsObj,
        assignedCleanings: assignedCleaningsObj,
        roomAssignments: formattedRoomAssignments,
        cleaningWork: formattedCleaningWork,
        attendance: formattedAttendance,
        novelties: formattedNovelties,
        staff: (staff || []).map(person => ({
          id: person.id_personal,
          name: person.nombre,
          contact: person.contacto
        })),
        events: formattedEvents
      };
    } catch (e) {
      console.error("[HotelDB] Excepción conectando a Supabase:", e);
      return null;
    }
  }

  // 2. MUTACIONES A SUPABASE

  async function updateRoom(roomId, updates) {
    const sb = getClient();
    if (!sb) return false;

    const row = {};
    if (updates.status !== undefined) {
      const status = statusToDatabase[updates.status];
      if (!status) throw new Error("Estado de habitación no válido.");
      row.estado = status;
    }
    if (updates.guest !== undefined) row.nombre_huesped = updates.guest;
    if (updates.servicePlan !== undefined) row.plan_limpieza = updates.servicePlan;
    if (updates.cleaningDetails !== undefined) row.detalles_limpieza = updates.cleaningDetails;
    if (updates.assignedCleaner !== undefined) {
      row.id_personal_asignado = updates.assignedCleaner ? updates.assignedCleaner.id : null;
      row.tipo_limpieza_asignada = updates.assignedCleaningType || null;
    }
    row.actualizado_en = new Date().toISOString();

    const { error } = await sb.from("habitaciones").upsert({ id_habitacion: String(roomId), ...row });
    if (error) throw error;
    return true;
  }

  async function addEvent(event) {
    const sb = getClient();
    if (!sb) return;

    const status = statusToDatabase[event.status];
    if (!status) throw new Error("Estado de evento no válido.");
    const { error } = await sb.from("eventos").insert({
      id_habitacion: String(event.room),
      estado: status,
      accion: event.action || "No Registrado",
      nombre_huesped: event.guest || null,
      responsable: event.actor && event.actor !== "No Registrado" ? event.actor : null,
      id_personal: event.cleanerId || null,
      tipo_limpieza: event.cleaningType || null,
      creado_en: event.time || new Date().toISOString()
    });
    if (error) throw error;
  }

  async function addCleaningWork(work) {
    const sb = getClient();
    if (!sb) return;

    const { error } = await sb.from("trabajos_limpieza").insert({
      id_personal: work.staffId,
      nombre_personal: work.staffName || "No Registrado",
      id_habitacion: String(work.room),
      tipo_limpieza: work.cleaningType || null,
      creado_en: work.time || new Date().toISOString()
    });
    if (error) throw error;
  }

  async function createStaff(person) {
    const sb = getClient();
    if (!sb) return null;

    const digits = String(person.contact || "").replace(/\D/g, "");
    if (digits.length < 7) throw new Error("El personal debe tener un teléfono válido.");
    if (!window.crypto?.getRandomValues) throw new Error("Este navegador no permite generar una clave segura.");

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const maxByte = Math.floor(256 / alphabet.length) * alphabet.length;
    let password = "";
    while (password.length < 16) {
      const randomBytes = new Uint8Array(16 - password.length);
      window.crypto.getRandomValues(randomBytes);
      randomBytes.forEach(byte => {
        if (byte < maxByte && password.length < 16) password += alphabet[byte % alphabet.length];
      });
    }

    const { error } = await sb.rpc("crear_aseador", {
      p_id_personal: person.id,
      p_nombre: person.name,
      p_contacto: person.contact,
      p_password: password
    });
    if (error) throw error;
    return password;
  }

  async function loginCleaner(phone, password) {
    const sb = getClient();
    if (!sb) throw new Error("No hay conexión con Supabase.");

    const { data, error } = await sb.rpc("autenticar_aseador", {
      p_telefono: phone,
      p_password: password
    });
    if (error) throw error;
    return Array.isArray(data) && data.length === 1 ? data[0] : null;
  }

  async function getCleanerRooms(phone, password) {
    const sb = getClient();
    if (!sb) throw new Error("No hay conexión con Supabase.");

    const { data, error } = await sb.rpc("habitaciones_aseador", {
      p_telefono: phone,
      p_password: password
    });
    if (error) throw error;
    return data || [];
  }

  async function finishCleanerRoom(phone, password, roomId) {
    const sb = getClient();
    if (!sb) throw new Error("No hay conexión con Supabase.");

    const { data, error } = await sb.rpc("finalizar_habitacion_aseador", {
      p_telefono: phone,
      p_password: password,
      p_id_habitacion: String(roomId)
    });
    if (error) throw error;
    if (data !== true) throw new Error("No se pudo finalizar la habitación.");
  }

  async function removeStaff(id) {
    const sb = getClient();
    if (!sb) return;

    const { error: assignmentsError } = await sb.from("habitaciones").update({
      id_personal_asignado: null,
      tipo_limpieza_asignada: null
    }).eq("id_personal_asignado", id);
    if (assignmentsError) throw assignmentsError;

    const { error } = await sb.from("personal").update({ activo: false }).eq("id_personal", id);
    if (error) throw error;
  }

  async function saveAttendance(attRecord) {
    const sb = getClient();
    if (!sb) return;

    const { error } = await sb.from("asistencias").upsert({
      id_asistencia: attRecord.id,
      id_personal: attRecord.staffId,
      nombre_personal: attRecord.staffName || "No Registrado",
      entrada: attRecord.checkIn,
      salida: attRecord.checkOut || null
    });
    if (error) throw error;
  }

  async function addNovelty(novRecord) {
    const sb = getClient();
    if (!sb) return;

    const { error } = await sb.from("novedades").insert({
      id_novedad: novRecord.id,
      id_personal: novRecord.staffId,
      nombre_personal: novRecord.staffName || "No Registrado",
      fecha: novRecord.date,
      tipo: novRecord.type,
      etiqueta: novRecord.label,
      notas: novRecord.notes || null,
      minutos_extra: novRecord.extraMinutes ?? null,
      creado_en: novRecord.createdAt || new Date().toISOString()
    });
    if (error) throw error;
  }

  // 3. SUSCRIPCIÓN EN TIEMPO REAL (WEBSOCKETS)
  function subscribeRealtime(onSyncRequired) {
    const sb = getClient();
    if (!sb || typeof sb.channel !== "function") return null;

    const channel = sb.channel("hotel-realtime-sync")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        console.log("[Supabase Realtime] Cambio detectado:", payload.table, payload.eventType);
        if (typeof onSyncRequired === "function") {
          onSyncRequired(payload);
        }
      })
      .subscribe((status) => {
        console.log("[Supabase Realtime] Estado de conexión:", status);
      });

    return channel;
  }

  return {
    fetchRemoteState,
    updateRoom,
    addEvent,
    addCleaningWork,
    createStaff,
    loginCleaner,
    getCleanerRooms,
    finishCleanerRoom,
    removeStaff,
    saveAttendance,
    addNovelty,
    subscribeRealtime
  };
})();
