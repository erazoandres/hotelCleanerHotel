// ==============================================================================
// AGENTE INTELIGENTE DEL HOTEL (POWERED BY GROQ + FUNCTION CALLING)
// ==============================================================================

window.HotelBot = (function () {
  "use strict";

  const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

  // Herramientas / Tools que el bot puede llamar selectivamente
  const TOOLS = [
    {
      type: "function",
      function: {
        name: "get_rooms_summary",
        description: "Obtiene las métricas generales de habitaciones (total libres, ocupadas, pendientes, en limpieza y porcentaje de ocupación).",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "get_specific_room",
        description: "Consulta el detalle exacto de una habitación específica (estado, huésped actual, plan de limpieza, encargado asignado y notas).",
        parameters: {
          type: "object",
          properties: {
            room_number: { type: "string", description: "Número de la habitación, ej. '101', '102', '201'" }
          },
          required: ["room_number"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_rooms_by_status",
        description: "Lista las habitaciones que coinciden con un estado ('free' para libres, 'occupied' para ocupadas, 'pending' para pendientes por limpiar, 'cleaning' para en limpieza).",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["free", "occupied", "pending", "cleaning"], description: "Estado a filtrar" }
          },
          required: ["status"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_staff_list",
        description: "Obtiene el listado del personal de aseo y su medio de contacto.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "get_recent_events",
        description: "Obtiene los últimos movimientos o actividades registradas en el hotel (check-ins, limpiezas completadas, salidas).",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Cantidad de eventos a traer (por defecto 5)" }
          }
        }
      }
    }
  ];

  // Ejecutor de herramientas locales contra el estado real / Supabase
  function executeTool(name, args) {
    const sb = window.sbClient || (window.parent && window.parent.sbClient);
    let state = {};
    if (typeof window.readState === "function") {
      state = window.readState();
    } else {
      try {
        state = JSON.parse(localStorage.getItem("control-habitaciones-state-v3") || "{}");
      } catch (e) {
        state = {};
      }
    }

    const rooms = state.rooms || {};
    const guests = state.guests || {};
    const plans = state.servicePlans || {};
    const details = state.cleaningDetails || {};
    const assignments = state.assignedCleanings || {};
    const staff = state.staff || [];
    const events = state.events || [];

    if (name === "get_rooms_summary") {
      const stats = state.stats || { free: 0, occupied: 0, pending: 0, cleaning: 0 };
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      if (!total) {
        return {
          total_habitaciones: "No Registrado",
          porcentaje_ocupacion: "No Registrado",
          estados: "No Registrado"
        };
      }
      const occupancy = Math.round((stats.occupied / total) * 100);
      return { stats, total_habitaciones: total, porcentaje_ocupacion: occupancy + "%" };
    }

    if (name === "get_specific_room") {
      const r = String(args.room_number || "").trim();
      if (!Object.prototype.hasOwnProperty.call(rooms, r)) {
        return {
          habitacion: "No Registrado",
          estado: "No Registrado",
          huesped: "No Registrado",
          plan_limpieza: "No Registrado",
          personal_asignado: "No Registrado",
          notas: "No Registrado"
        };
      }
      const statusLabels = {
        free: "Libre",
        occupied: "Ocupada",
        pending: "Pendiente",
        cleaning: "En limpieza"
      };
      return {
        habitacion: r,
        estado: statusLabels[rooms[r]] || "No Registrado",
        huesped: guests[r] || "No Registrado",
        plan_limpieza: plans[r] || "No Registrado",
        personal_asignado: assignments[r]?.staffName || "No Registrado",
        notas: details[r] || "No Registrado"
      };
    }

    if (name === "get_rooms_by_status") {
      const targetStatus = args.status;
      const matched = Object.entries(rooms)
        .filter(([_, st]) => st === targetStatus)
        .map(([id]) => ({
          numero: id,
          huesped: guests[id] || "No Registrado",
          asignado: assignments[id]?.staffName || "No Registrado"
        }));
      return { total: matched.length, estado: targetStatus, habitaciones: matched };
    }

    if (name === "get_staff_list") {
      return staff.map(s => ({ id: s.id, nombre: s.name || "No Registrado", contacto: s.contact || "No Registrado" }));
    }

    if (name === "get_recent_events") {
      const limit = args.limit || 5;
      return events.slice(0, limit).map(e => ({
        habitacion: e.room || "No Registrado",
        accion: e.action || "No Registrado",
        responsable: e.actor || "No Registrado",
        hora: e.time || "No Registrado"
      }));
    }

    return { error: "Herramienta no encontrada" };
  }

  // Llamada al API de Groq
  async function callGroqAPI(messages, tools) {
    const config = window.GROQ_CONFIG || {};
    if (!config.apiKey || config.apiKey.includes("TU-GROQ-API-KEY")) {
      throw new Error("Por favor configura tu API Key de Groq en `groq-config.js`");
    }

    const payload = {
      model: config.model || "llama-3.3-70b-versatile",
      messages: messages,
      temperature: 0.2
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Error ${res.status}: Falló la llamada a Groq.`);
    }

    return await res.json();
  }

  // Ciclo conversacional completo con razonamiento y obtención selectiva de datos
  async function ask(userPrompt, conversationHistory = []) {
    const systemPrompt = {
      role: "system",
      content: `Eres el asistente operativo del sistema de control hotelero.
Tu trabajo es responder preguntas sobre el estado del hotel, habitaciones, huéspedes, personal de aseo y novedades.
REGLAS OBLIGATORIAS:
1. Sé SIEMPRE conciso, directo y exacto. Responde de forma cordial y breve (1 a 3 oraciones como máximo).
2. Si te preguntan por datos del negocio o habitaciones, USA LAS HERRAMIENTAS adecuadas para recuperar ÚNICAMENTE el dato exacto que necesitas. NO inventes información.
3. Si la respuesta contiene números de habitación, estados o nombres, darlos con precisión.
4. Si el dato no aparece en la información consultada, responde exactamente "No Registrado" para ese dato y no lo completes por inferencia.
5. Habla siempre en español.`
    };

    const messages = [
      systemPrompt,
      ...conversationHistory,
      { role: "user", content: userPrompt }
    ];

    // Paso 1: El modelo analiza la pregunta y decide si necesita consultar datos
    const firstResponse = await callGroqAPI(messages, TOOLS);
    const messageChoice = firstResponse.choices[0]?.message;

    // Si el modelo solicitó llamar a una o más herramientas
    if (messageChoice?.tool_calls && messageChoice.tool_calls.length > 0) {
      messages.push(messageChoice);

      for (const call of messageChoice.tool_calls) {
        const functionName = call.function.name;
        let functionArgs = {};
        try {
          functionArgs = JSON.parse(call.function.arguments);
        } catch (e) {
          functionArgs = {};
        }

        const toolResult = executeTool(functionName, functionArgs);

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: functionName,
          content: JSON.stringify(toolResult)
        });
      }

      // Paso 2: El modelo recibe la respuesta exacta de la base de datos y sintetiza la respuesta final
      const secondResponse = await callGroqAPI(messages);
      return secondResponse.choices[0]?.message?.content || "Información procesada.";
    }

    return messageChoice?.content || "Entendido.";
  }

  return {
    ask
  };
})();
