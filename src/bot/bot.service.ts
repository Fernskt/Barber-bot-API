import {
  isPastDate,
  isSunday,
  isTooFarInFuture,
  isValidDateFormat,
} from '../common/utils/date.util';
import { Injectable } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ServicesService } from '../services/services.service';
import { ConversationStateService } from '../conversation-state/conversation-state.service';
import { CustomersService } from '../customers/customers.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { StaffService } from '../staff/staff.service';
import { BASE_SCHEDULES } from '../common/constants/schedules';
import { buildSchedulesMessage } from '../common/utils/schedule.util';

@Injectable()
export class BotService {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly servicesService: ServicesService,
    private readonly conversationStateService: ConversationStateService,
    private readonly customersService: CustomersService,
    private readonly appointmentsService: AppointmentsService,
    private readonly staffService: StaffService,
  ) {}

  async handleIncoming(payload: any) {
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return;

    const from = message.from;
    const text = message.text?.body?.trim().toLowerCase() || '';

    console.log('Incoming message:', text);

    const currentState = await this.conversationStateService.getState(from);

    if (text === 'hola' || text === 'menu') {
      await this.conversationStateService.setState(from, 'MAIN_MENU');

      await this.whatsappService.sendText(
        from,
        `💈 *Bienvenido a BarberShop* 💈
¿En qué puedo ayudarte?

​1️⃣​ Reservar turno
​2️⃣​ Ver servicios
​3️⃣​ Horarios
​4️⃣​ Hablar con un barbero
​5️⃣​ Cancelar un turno
6️⃣ Reprogramar turno`,
      );
      return;
    }

    if (currentState?.state === 'SELECTING_SERVICE') {
      const services = await this.servicesService.findAll();
      const selectedIndex = Number(text) - 1;
      const selectedService = services[selectedIndex];

      if (!selectedService) {
        await this.whatsappService.sendText(
          from,
          'Opción inválida. Respondé con el número de un servicio.',
        );
        return;
      }

      const staffList = await this.staffService.findAllActive();

      if (!staffList.length) {
        await this.whatsappService.sendText(
          from,
          'No hay barberos disponibles en este momento.',
        );
        return;
      }

      const staffText = staffList
        .map((staff, index) => `${index + 1}. ${staff.name}`)
        .join('\n');

      await this.conversationStateService.setState(from, 'SELECTING_STAFF', {
        serviceId: selectedService.id,
        serviceName: selectedService.name,
      });

      await this.whatsappService.sendText(
        from,
        `Elegiste: ${selectedService.name} ✅

Ahora elegí un barbero:

${staffText}

Respondé con el número de la opción.`,
      );
      return;
    }

    if (currentState?.state === 'SELECTING_STAFF') {
      const staffList = await this.staffService.findAllActive();
      const selectedIndex = Number(text) - 1;
      const selectedStaff = staffList[selectedIndex];

      if (!selectedStaff) {
        await this.whatsappService.sendText(
          from,
          'Opción inválida. Respondé con el número de un barbero.',
        );
        return;
      }

      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? currentState.payload
          : {};

      await this.conversationStateService.setState(from, 'ASKING_NAME', {
        ...currentPayload,
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
      });

      await this.whatsappService.sendText(
        from,
        `Elegiste a ${selectedStaff.name} ✂️

Ahora decime tu nombre.`,
      );
      return;
    }

    if (currentState?.state === 'ASKING_NAME') {
      const customerName = message.text?.body?.trim();

      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? currentState.payload
          : {};

      await this.conversationStateService.setState(from, 'ASKING_DATE', {
        ...currentPayload,
        customerName,
      });

      await this.whatsappService.sendText(
        from,
        `*Perfecto, ${customerName}* 👌

📆 Ahora decime la fecha en formato *YYYY-MM-DD*.
*Ejemplo:* 2026-03-21

*Importante:*
- No atendemos domingos
- Solo tomamos turnos desde hoy hasta 30 días en adelante`,
      );
      return;
    }

    if (currentState?.state === 'ASKING_DATE') {
      const dateText = message.text?.body?.trim() || '';

      if (!isValidDateFormat(dateText)) {
        await this.whatsappService.sendText(
          from,
          'Fecha inválida. Usá el formato *YYYY-MM-DD*.\n*Ejemplo:* 2026-03-21',
        );
        return;
      }

      if (isPastDate(dateText)) {
        await this.whatsappService.sendText(
          from,
          '​​❌ ​No podés reservar turnos en *fechas pasadas*. Elegí una fecha desde *hoy* en adelante.',
        );
        return;
      }

      if (isSunday(dateText)) {
        await this.whatsappService.sendText(
          from,
          '⚠️​ Los domingos estamos *cerrados*. Elegí otra fecha.',
        );
        return;
      }

      if (isTooFarInFuture(dateText, 30)) {
        await this.whatsappService.sendText(
          from,
          '⚠️​ Solo podés reservar con *hasta 30 días de anticipación*. Elegí una fecha más cercana.',
        );
        return;
      }

      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      const staffId = currentPayload.staffId as string;

      const appointments = await this.appointmentsService.findByDateAndStaff(
        dateText,
        staffId,
      );

      const occupiedSchedules = appointments.map((appointment) =>
        appointment.startsAt.toISOString().slice(11, 16),
      );

      const availableSchedules = BASE_SCHEDULES.filter(
        (schedule) => !occupiedSchedules.includes(schedule),
      );

      if (!availableSchedules.length) {
        await this.whatsappService.sendText(
          from,
          '​​❌​ No hay horarios disponibles para esa fecha con ese barbero. Probá con otra.',
        );
        return;
      }

      await this.conversationStateService.setState(from, 'SELECTING_TIME', {
        ...currentPayload,
        selectedDate: dateText,
        availableSchedules,
      });

      await this.whatsappService.sendText(
        from,
        `🕒 *Estos son los horarios disponibles:*

${buildSchedulesMessage(availableSchedules)}

Respondé con el *número* del horario.`,
      );
      return;
    }

    if (currentState?.state === 'SELECTING_TIME') {
      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      const availableSchedules = Array.isArray(
        currentPayload.availableSchedules,
      )
        ? currentPayload.availableSchedules
        : [];

      const selectedIndex = Number(text) - 1;
      const selectedTime = availableSchedules[selectedIndex];

      if (!selectedTime) {
        await this.whatsappService.sendText(
          from,
          '​​❌​ Horario inválido. Respondé con el *número* de la opción.',
        );
        return;
      }

      const customerName = currentPayload.customerName as string;
      const serviceId = currentPayload.serviceId as string;
      const serviceName = currentPayload.serviceName as string;
      const staffId = currentPayload.staffId as string;
      const staffName = currentPayload.staffName as string;
      const selectedDate = currentPayload.selectedDate as string;

      const startsAt = new Date(`${selectedDate}T${selectedTime}:00`);

      const existingAppointment =
        await this.appointmentsService.findByStartsAtAndStaff(
          startsAt,
          staffId,
        );

      if (existingAppointment) {
        await this.whatsappService.sendText(
          from,
          ' ​​⚠️​ Ese horario acaba de ocuparse. Probá con otro horario o escribí ​​✍️​ otra fecha. ​​👇​',
        );

        await this.conversationStateService.setState(from, 'ASKING_DATE', {
          serviceId,
          serviceName,
          staffId,
          staffName,
          customerName,
        });

        return;
      }

      const customer = await this.customersService.findOrCreate(
        from,
        customerName,
      );

      await this.appointmentsService.createAppointment({
        customerId: customer.id,
        serviceId,
        staffId,
        startsAt,
      });

      await this.conversationStateService.setState(from, 'BOOKING_CONFIRMED', {
        ...currentPayload,
        selectedTime,
      });

      await this.whatsappService.sendText(
        from,
        `✅ *Turno confirmado!*

*Nombre:* ${customerName}
*Servicio:* ${serviceName}
*Barbero:* ${staffName}
*Fecha:* ${selectedDate}
*Horario:* ${selectedTime}

Gracias por reservar en *BarberShop* 💈`,
      );
      return;
    }

    if (currentState?.state === 'WAITING_HUMAN_HELP') {
      const userMessage = message.text?.body?.trim();

      await this.conversationStateService.setState(
        from,
        'HUMAN_HELP_REQUESTED',
        {
          userMessage,
        },
      );

      await this.whatsappService.sendText(
        from,
        `✅ *Tu consulta fue registrada:*

"_${userMessage}_"

Te responderemos a la brevedad. Escribí ​​✍️​ *"menu"* para volver al inicio.​`,
      );
      return;
    }

    if (currentState?.state === 'CONFIRMING_CANCELLATION') {
      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      if (text === '1') {
        await this.appointmentsService.cancelAppointment(
          currentPayload.appointmentId as string,
        );

        await this.conversationStateService.setState(from, 'MAIN_MENU');

        await this.whatsappService.sendText(
          from,
          `✅ *Tu turno fue cancelado correctamente.*

Escribí ​​✍️​ *"menu"* para volver al inicio. 👇​`,
        );
        return;
      }

      if (text === '2') {
        await this.conversationStateService.setState(from, 'MAIN_MENU');

        await this.whatsappService.sendText(
          from,
          `Operación cancelada.

Escribí ​​✍️​ *"menu"* para volver al inicio. 👇​`,
        );
        return;
      }

      await this.whatsappService.sendText(
        from,
        'Opción inválida. Respondé con 1 para confirmar o 2 para volver.',
      );
      return;
    }

    if (currentState?.state === 'CONFIRMING_RESCHEDULE') {
      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      if (text === '1') {
        await this.conversationStateService.setState(
          from,
          'RESCHEDULE_ASKING_DATE',
          {
            ...currentPayload,
          },
        );

        await this.whatsappService.sendText(
          from,
          `📆 Decime la *nueva fecha* en formato *YYYY-MM-DD*.

*Importante:*
- No atendemos domingos
- Solo tomamos turnos desde hoy hasta 30 días en adelante`,
        );
        return;
      }

      if (text === '2') {
        await this.conversationStateService.setState(from, 'MAIN_MENU');

        await this.whatsappService.sendText(
          from,
          'Operación cancelada.\nEscribí *"menu"* para volver al inicio.',
        );
        return;
      }

      await this.whatsappService.sendText(
        from,
        'Opción inválida. Respondé con 1 para confirmar o 2 para volver.',
      );
      return;
    }

    if (currentState?.state === 'RESCHEDULE_ASKING_DATE') {
      const dateText = message.text?.body?.trim() || '';

      if (!isValidDateFormat(dateText)) {
        await this.whatsappService.sendText(
          from,
          'Fecha inválida. Usá el formato *YYYY-MM-DD*.\n*Ejemplo:* 2026-03-21',
        );
        return;
      }

      if (isPastDate(dateText)) {
        await this.whatsappService.sendText(
          from,
          'No podés reprogramar a una fecha pasada. Elegí una fecha desde hoy en adelante.',
        );
        return;
      }

      if (isSunday(dateText)) {
        await this.whatsappService.sendText(
          from,
          'Los domingos estamos cerrados. Elegí otra fecha.',
        );
        return;
      }

      if (isTooFarInFuture(dateText, 30)) {
        await this.whatsappService.sendText(
          from,
          'Solo podés reservar con hasta 30 días de anticipación. Elegí una fecha más cercana.',
        );
        return;
      }

      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      const staffId = currentPayload.staffId as string;
      const appointmentId = currentPayload.appointmentId as string;

      const appointments = await this.appointmentsService.findByDateAndStaff(
        dateText,
        staffId,
      );

      const occupiedSchedules = appointments
        .filter((appointment) => appointment.id !== appointmentId)
        .map((appointment) => appointment.startsAt.toISOString().slice(11, 16));

      const availableSchedules = BASE_SCHEDULES.filter(
        (schedule) => !occupiedSchedules.includes(schedule),
      );

      if (!availableSchedules.length) {
        await this.whatsappService.sendText(
          from,
          'No hay horarios disponibles para esa fecha con ese barbero. Probá con otra.',
        );
        return;
      }

      await this.conversationStateService.setState(
        from,
        'RESCHEDULE_SELECTING_TIME',
        {
          ...currentPayload,
          selectedDate: dateText,
          availableSchedules,
        },
      );

      await this.whatsappService.sendText(
        from,
        `🕒 *Estos son los horarios disponibles para reprogramar:*

${buildSchedulesMessage(availableSchedules)}

Respondé con el *número* del horario.`,
      );
      return;
    }

    if (currentState?.state === 'RESCHEDULE_SELECTING_TIME') {
      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      const availableSchedules = Array.isArray(
        currentPayload.availableSchedules,
      )
        ? currentPayload.availableSchedules
        : [];

      const selectedIndex = Number(text) - 1;
      const selectedTime = availableSchedules[selectedIndex];

      if (!selectedTime) {
        await this.whatsappService.sendText(
          from,
          'Horario inválido. Respondé con el *número* de la opción.',
        );
        return;
      }

      const appointmentId = currentPayload.appointmentId as string;
      const serviceName = currentPayload.serviceName as string;
      const staffId = currentPayload.staffId as string;
      const staffName = currentPayload.staffName as string;
      const customerName = currentPayload.customerName as string;
      const selectedDate = currentPayload.selectedDate as string;

      const startsAt = new Date(`${selectedDate}T${selectedTime}:00`);

      const existingAppointment =
        await this.appointmentsService.findByStartsAtAndStaff(
          startsAt,
          staffId,
        );

      if (existingAppointment && existingAppointment.id !== appointmentId) {
        await this.whatsappService.sendText(
          from,
          'Ese horario acaba de ocuparse. Probá con otro horario o escribí otra fecha.',
        );

        await this.conversationStateService.setState(
          from,
          'RESCHEDULE_ASKING_DATE',
          {
            ...currentPayload,
          },
        );

        return;
      }

      await this.appointmentsService.updateAppointmentDateTime(
        appointmentId,
        startsAt,
      );

      await this.conversationStateService.setState(from, 'MAIN_MENU');

      await this.whatsappService.sendText(
        from,
        `✅ *Turno reprogramado correctamente*

Nombre: ${customerName}
Servicio: ${serviceName}
Barbero: ${staffName}
Nueva fecha: ${selectedDate}
Nuevo horario: ${selectedTime}

Escribí *"menu"* para volver al inicio.`,
      );
      return;
    }

    if (text === '1') {
      const services = await this.servicesService.findAll();

      if (!services.length) {
        await this.whatsappService.sendText(
          from,
          'Todavía no hay servicios cargados.',
        );
        return;
      }

      const servicesText = services
        .map(
          (service, index) =>
            `${index + 1}. ${service.name} - $${service.price} - ${service.durationMinutes} min`,
        )
        .join('\n');

      await this.conversationStateService.setState(from, 'SELECTING_SERVICE');

      await this.whatsappService.sendText(
        from,
        `✂️ *Elegí un servicio:*

${servicesText}

Respondé con el *número* de la opción.`,
      );
      return;
    }

    if (text === '2') {
      const services = await this.servicesService.findAll();

      if (!services.length) {
        await this.whatsappService.sendText(
          from,
          'Todavía no hay servicios cargados.',
        );
        return;
      }

      const servicesText = services
        .map(
          (service, index) =>
            `${index + 1}. ${service.name} - $${service.price} - ${service.durationMinutes} min`,
        )
        .join('\n');

      await this.whatsappService.sendText(
        from,
        `💇 *Servicios disponibles:*

${servicesText}

Escribí ​​✍️​ *"menu"* para volver. 👇​`,
      );
      return;
    }

    if (text === '3') {
      await this.whatsappService.sendText(
        from,
        `🕘 *Horarios de atención*

*Lunes a viernes:* 10:00 a 19:00
*Sábados:* 10:00 a 14:00
*Domingos:* cerrado ​❌​

Escribí ​​✍️​ *"menu"* para volver al inicio. 👇 ​`,
      );
      return;
    }

    if (text === '4') {
      await this.conversationStateService.setState(from, 'WAITING_HUMAN_HELP');

      await this.whatsappService.sendText(
        from,
        `✉️ En breve un barbero te va a responder.

Por favor, escribí ​​✍️​ tu consulta y la dejamos registrada. 👇​`,
      );
      return;
    }

    if (text === '5') {
      const appointment =
        await this.appointmentsService.findNextAppointmentByCustomerPhone(from);

      if (!appointment) {
        await this.whatsappService.sendText(
          from,
          '​​🔴​ No encontré turnos futuros confirmados para cancelar.\nEscribí ​​✍️​ "menu" para volver. 👇​',
        );
        return;
      }

      const appointmentDate = appointment.startsAt.toISOString().slice(0, 10);
      const appointmentTime = appointment.startsAt.toISOString().slice(11, 16);

      await this.conversationStateService.setState(
        from,
        'CONFIRMING_CANCELLATION',
        {
          appointmentId: appointment.id,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          appointmentDate,
          appointmentTime,
        },
      );

      await this.whatsappService.sendText(
        from,
        `✅ *Encontré este turno:*

*Servicio:* ${appointment.service.name}
*Barbero:* ${appointment.staff.name}
*Fecha:* ${appointmentDate}
*Horario:* ${appointmentTime}

*Respondé con:*

1️⃣ Confirmar cancelación
2️⃣ Volver al menú`,
      );
      return;
    }

    if (text === '6') {
      const appointment =
        await this.appointmentsService.findNextAppointmentByCustomerPhone(from);

      if (!appointment) {
        await this.whatsappService.sendText(
          from,
          'No encontré turnos futuros confirmados para reprogramar.\nEscribí "menu" para volver.',
        );
        return;
      }

      const appointmentDate = appointment.startsAt.toISOString().slice(0, 10);
      const appointmentTime = appointment.startsAt.toISOString().slice(11, 16);

      await this.conversationStateService.setState(
        from,
        'CONFIRMING_RESCHEDULE',
        {
          appointmentId: appointment.id,
          serviceId: appointment.serviceId,
          serviceName: appointment.service.name,
          staffId: appointment.staffId,
          staffName: appointment.staff.name,
          customerName: appointment.customer.name,
          oldDate: appointmentDate,
          oldTime: appointmentTime,
        },
      );

      await this.whatsappService.sendText(
        from,
        `🔄 *Encontré este turno:*

Servicio: ${appointment.service.name}
Barbero: ${appointment.staff.name}
Fecha: ${appointmentDate}
Horario: ${appointmentTime}

1️⃣ Confirmar reprogramación
2️⃣ Volver al menú`,
      );
      return;
    }

    await this.whatsappService.sendText(
      from,
      'No entendí tu mensaje. Escribí ​​✍️​ *"hola"* o *"menu"* para comenzar. 👇​',
    );
  }
}
