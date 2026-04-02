import {
  buildLocalDateTime,
  isPastDate,
  isSunday,
  isTooFarInFuture,
  isValidDateFormat,
  requiresMinimumLeadTime,
} from '../common/utils/date.util';
import { Injectable } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ServicesService } from '../services/services.service';
import { ConversationStateService } from '../conversation-state/conversation-state.service';
import { CustomersService } from '../customers/customers.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { StaffService } from '../staff/staff.service';
import { StaffAvailabilityService } from '../staff/staff-availability.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { WEEKDAY_ORDER, WEEKDAY_LABELS } from '../common/constants/weekdays';
import { buildSchedulesMessage } from '../common/utils/schedule.util';
import { BusinessConfigService } from '../business-config/business-config.service';
import { getWeekdayKey } from '../common/utils/day.util';
import { Service as ServiceModel, Staff as StaffModel } from '@prisma/client';
import { MENU_NAVIGATION_BUTTONS } from '../common/constants/buttons';

@Injectable()
export class BotService {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly servicesService: ServicesService,
    private readonly conversationStateService: ConversationStateService,
    private readonly customersService: CustomersService,
    private readonly appointmentsService: AppointmentsService,
    private readonly staffService: StaffService,
    private readonly businessConfigService: BusinessConfigService,
    private readonly staffAvailabilityService: StaffAvailabilityService,
    private readonly waitlistService: WaitlistService,
  ) {}

  private async sendMainMenu(to: string) {
    await this.conversationStateService.setState(to, 'MAIN_MENU');

    const config =
      (await this.businessConfigService.getConfig()) ||
      (await this.businessConfigService.createDefaultConfig());

    await this.whatsappService.sendListMessage(
      to,
      `${config.welcomeMessage || '¿En qué puedo ayudarte hoy?'}`,
      'Ver opciones',
      [
        {
          id: 'menu_reservar',
          title: 'Reservar turno',
          description: 'Quiero reservar un turno',
        },
        {
          id: 'menu_servicios',
          title: 'Ver servicios',
          description: 'Quiero consultar servicios, precios y duración',
        },
        {
          id: 'menu_horarios',
          title: 'Horarios',
          description: 'Quiero ver los días y horarios de atención',
        },
        {
          id: 'menu_barbero',
          title: 'Hablar con un barbero',
          description: 'Quiero dejar una consulta',
        },
        {
          id: 'menu_cancelar',
          title: 'Cancelar turno',
          description: 'Quiero cancelar mi próximo turno confirmado',
        },
        {
          id: 'menu_reprogramar',
          title: 'Reprogramar turno',
          description: 'Quiero cambiar la fecha y horario de mi turno',
        },
      ],
      {
        headerText: `💈 ${config.businessName}`,
        footerText: 'Seleccioná una opción del menú',
        sectionTitle: 'Menú principal',
      },
    );
  }

  private async sendMessageWithNavigationButtons(
    to: string,
    body: string,
    headerText?: string,
  ) {
    await this.whatsappService.sendReplyButtons(
      to,
      body,
      MENU_NAVIGATION_BUTTONS,
      {
        headerText,
        footerText: 'Elegí una opción',
      },
    );
  }

  async handleIncoming(payload: any) {
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return;

    const from = message.from;
    const text = this.whatsappService.extractMessageText(message);
    console.log('Incoming message:', text);

    const currentState = await this.conversationStateService.getState(from);

    if (text === 'go_menu') {
      await this.sendMainMenu(from);
      return;
    }

    if (text === 'exit_chat') {
      const config =
        (await this.businessConfigService.getConfig()) ||
        (await this.businessConfigService.createDefaultConfig());

      await this.conversationStateService.setState(from, 'CHAT_ENDED');

      await this.whatsappService.sendText(
        from,
        `✨ *Hasta pronto*

Gracias por comunicarte con *${config.businessName}* 💈

Cuando quieras, escribinos de nuevo. Te esperamos.`,
      );
      return;
    }

    if (text === 'hola' || text === 'menu') {
      await this.sendMainMenu(from);
      return;
    }

    if (currentState?.state === 'SELECTING_SERVICE') {
      const services = await this.servicesService.findAll();

      let selectedService: ServiceModel | null = null;

      if (text.startsWith('service_')) {
        const serviceId = text.replace('service_', '');
        selectedService =
          services.find((service) => service.id === serviceId) || null;
      } else {
        const selectedIndex = Number(text) - 1;
        selectedService = services[selectedIndex] || null;
      }

      if (!selectedService) {
        await this.whatsappService.sendText(
          from,
          ' ✖️ Servicio inválido. Por favor seleccioná una opción de la lista.',
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

      await this.conversationStateService.setState(from, 'SELECTING_STAFF', {
        serviceId: selectedService.id,
        serviceName: selectedService.name,
      });

      await this.whatsappService.sendListMessage(
        from,
        `Elegiste: ${selectedService.name} ✅\n\nAhora elegí un barbero.`,
        'Ver barberos',
        staffList.map((staff) => ({
          id: `staff_${staff.id}`,
          title: staff.name,
          description: 'Disponible para atenderte',
        })),
        {
          headerText: 'Barberos disponibles',
          footerText: 'Seleccioná un barbero',
          sectionTitle: 'Equipo',
        },
      );
      return;
    }

    if (currentState?.state === 'SELECTING_STAFF') {
      const staffList = await this.staffService.findAllActive();

      let selectedStaff: StaffModel | null = null;

      if (text.startsWith('staff_')) {
        const staffId = text.replace('staff_', '');
        selectedStaff = staffList.find((staff) => staff.id === staffId) || null;
      } else {
        const selectedIndex = Number(text) - 1;
        selectedStaff = staffList[selectedIndex] || null;
      }

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

      const config =
        (await this.businessConfigService.getConfig()) ||
        (await this.businessConfigService.createDefaultConfig());

      const weekdayKey = getWeekdayKey(dateText);

      const closedDays = this.businessConfigService.normalizeClosedDays(
        config.closedDays,
      );

      if (closedDays.includes(weekdayKey)) {
        await this.whatsappService.sendText(
          from,
          `❌ Ese día el local no atiende *(${weekdayKey})*. Elegí otra fecha.`,
        );
        return;
      }

      if (isTooFarInFuture(dateText, config.bookingWindowDays)) {
        await this.whatsappService.sendText(
          from,
          `⚠️​ Solo podés reservar con *hasta ${config.bookingWindowDays} días de anticipación*. Elegí una fecha más cercana.`,
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

      // Verificar disponibilidad del barbero en esa fecha
      const staffAvailability = await this.staffAvailabilityService.getForDate(
        staffId,
        dateText,
      );

      if (staffAvailability && !staffAvailability.isAvailable) {
        await this.whatsappService.sendText(
          from,
          `❌ *${currentPayload.staffName as string}* no trabaja ese día. Elegí otra fecha.`,
        );
        return;
      }

      const appointments = await this.appointmentsService.findByDateAndStaff(
        dateText,
        staffId,
      );

      const bookingSlots = this.businessConfigService.normalizeBookingSlots(
        config.bookingSlots,
      );

      let daySchedules = Array.isArray(bookingSlots[weekdayKey])
        ? bookingSlots[weekdayKey]
        : [];

      // Filtrar slots por horario personalizado del barbero
      if (staffAvailability?.isAvailable) {
        daySchedules = this.staffAvailabilityService.filterSlotsByHours(
          daySchedules,
          staffAvailability.startTime ?? null,
          staffAvailability.endTime ?? null,
        );
      }

      const occupiedSchedules = appointments.map((appointment) =>
        appointment.startsAt.toISOString().slice(11, 16),
      );

      const availableSchedules = daySchedules.filter(
        (schedule) =>
          !occupiedSchedules.includes(schedule) &&
          !requiresMinimumLeadTime(buildLocalDateTime(dateText, schedule)),
      );

      if (!availableSchedules.length) {
        await this.conversationStateService.setState(from, 'JOINING_WAITLIST', {
          ...currentPayload,
          selectedDate: dateText,
        });

        await this.whatsappService.sendReplyButtons(
          from,
          `❌ No hay horarios disponibles para esa fecha con *${currentPayload.staffName as string}*.

¿Querés anotarte en la *lista de espera*? Si se cancela un turno, te avisamos al instante.`,
          [
            { id: 'waitlist_join', title: '🔔 Anotarme' },
            { id: 'waitlist_skip', title: '📅 Otra fecha' },
          ],
          { headerText: 'Sin disponibilidad', footerText: 'Lista de espera' },
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

      const startsAt = buildLocalDateTime(selectedDate, selectedTime);

      if (requiresMinimumLeadTime(startsAt)) {
        await this.whatsappService.sendText(
          from,
          'Si reservás para hoy, el turno debe ser con al menos 2 horas de anticipación. Elegí otro horario o una fecha posterior.',
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

      await this.customersService.updateLastService(
        customer.id,
        serviceId,
        staffId,
      );

      await this.conversationStateService.setState(from, 'BOOKING_CONFIRMED', {
        ...currentPayload,
        selectedTime,
      });

      const config =
        (await this.businessConfigService.getConfig()) ||
        (await this.businessConfigService.createDefaultConfig());

      await this.whatsappService.sendText(
        from,
        `✅ *Turno confirmado!*

*Nombre:* ${customerName}
*Servicio:* ${serviceName}
*Barbero:* ${staffName}
*Fecha:* ${selectedDate}
*Horario:* ${selectedTime}

Gracias por reservar en *${config.businessName}* 💈`,
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

      await this.sendMessageWithNavigationButtons(
        from,
        `✅ *Tu consulta fue registrada:*

"_${userMessage}_"

Te responderemos a la brevedad.`,
        'Consulta registrada',
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

      if (text === '1' || text === 'cancel_confirm_yes') {
        const appointment = await this.appointmentsService.findById(
          currentPayload.appointmentId as string,
        );

        await this.appointmentsService.cancelAppointment(appointment.id);

        const freedDate = appointment.startsAt.toISOString().slice(0, 10);
        const freedTime = appointment.startsAt.toISOString().slice(11, 16);
        void this.waitlistService.checkAndNotifyForSlot(
          freedDate,
          freedTime,
          appointment.staffId,
        );

        await this.conversationStateService.setState(from, 'MAIN_MENU');

        await this.sendMessageWithNavigationButtons(
          from,
          `✅ *Tu turno fue cancelado correctamente.*`,
          'Turno cancelado',
        );
        return;
      }

      if (text === '2' || text === 'cancel_confirm_no') {
        await this.conversationStateService.setState(from, 'MAIN_MENU');
        await this.sendMainMenu(from);
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

      if (text === '1' || text === 'reschedule_confirm_yes') {
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

      if (text === '2' || text === 'reschedule_confirm_no') {
        await this.conversationStateService.setState(from, 'MAIN_MENU');

        await this.sendMainMenu(from);
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

      const config =
        (await this.businessConfigService.getConfig()) ||
        (await this.businessConfigService.createDefaultConfig());

      const weekdayKey = getWeekdayKey(dateText);

      const closedDays = Array.isArray(config.closedDays)
        ? config.closedDays.map(String)
        : [];

      if (closedDays.includes(weekdayKey)) {
        await this.whatsappService.sendText(
          from,
          `Ese día no atendemos (${weekdayKey}). Elegí otra fecha.`,
        );
        return;
      }

      const bookingSlots =
        config.bookingSlots && typeof config.bookingSlots === 'object'
          ? (config.bookingSlots as Record<string, string[]>)
          : {};

      const daySchedules = Array.isArray(bookingSlots[weekdayKey])
        ? bookingSlots[weekdayKey]
        : [];

      const appointments = await this.appointmentsService.findByDateAndStaff(
        dateText,
        staffId,
      );

      const occupiedSchedules = appointments
        .filter((appointment) => appointment.id !== appointmentId)
        .map((appointment) => appointment.startsAt.toISOString().slice(11, 16));

      const availableSchedules = daySchedules.filter(
        (schedule) =>
          !occupiedSchedules.includes(schedule) &&
          !requiresMinimumLeadTime(buildLocalDateTime(dateText, schedule)),
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

      const startsAt = buildLocalDateTime(selectedDate, selectedTime);

      if (requiresMinimumLeadTime(startsAt)) {
        await this.whatsappService.sendText(
          from,
          'Si reprogramás para hoy, el turno debe ser con al menos 2 horas de anticipación. Elegí otro horario o una fecha posterior.',
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

      const config =
        (await this.businessConfigService.getConfig()) ||
        (await this.businessConfigService.createDefaultConfig());

      await this.sendMessageWithNavigationButtons(
        from,
        `✅ *Turno reprogramado correctamente*

Nombre: ${customerName}
Servicio: ${serviceName}
Barbero: ${staffName}
Nueva fecha: ${selectedDate}
Nuevo horario: ${selectedTime}`,
        'Turno reprogramado',
      );
      return;
    }

    if (text === '1' || text === 'menu_reservar') {
      const services = await this.servicesService.findAll();

      if (!services.length) {
        await this.whatsappService.sendText(
          from,
          'Todavía no hay servicios cargados.',
        );
        return;
      }

      const existingCustomer = await this.customersService.findByPhone(from);

      if (
        existingCustomer?.lastServiceId &&
        existingCustomer.lastService &&
        existingCustomer.lastStaff?.active
      ) {
        await this.conversationStateService.setState(
          from,
          'CONFIRMING_REPEAT_SERVICE',
          {
            lastServiceId: existingCustomer.lastServiceId,
            lastServiceName: existingCustomer.lastService.name,
            lastStaffId: existingCustomer.lastStaffId,
            lastStaffName: existingCustomer.lastStaff.name,
          },
        );

        await this.whatsappService.sendReplyButtons(
          from,
          `Tu último servicio fue *${existingCustomer.lastService.name}* con *${existingCustomer.lastStaff.name}*.\n\n¿Querés reservar lo mismo?`,
          [
            { id: 'repeat_yes', title: 'Sí, lo mismo' },
            { id: 'repeat_no', title: 'No, cambiar' },
          ],
          {
            headerText: '✂️ Reservar turno',
            footerText: 'Seleccioná una opción',
          },
        );
        return;
      }

      await this.conversationStateService.setState(from, 'SELECTING_SERVICE');

      await this.whatsappService.sendListMessage(
        from,
        'Elegí el servicio que querés reservar.',
        'Ver servicios',
        services.map((service) => ({
          id: `service_${service.id}`,
          title: service.name,
          description: `$${service.price} • ${service.durationMinutes} min`,
        })),
        {
          headerText: '✂️ Reservar turno',
          footerText: 'Seleccioná un servicio',
          sectionTitle: 'Servicios',
        },
      );
      return;
    }

    if (currentState?.state === 'CONFIRMING_REPEAT_SERVICE') {
      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      if (text === 'repeat_yes') {
        const existingCustomer = await this.customersService.findByPhone(from);

        if (existingCustomer?.name) {
          await this.conversationStateService.setState(from, 'ASKING_DATE', {
            serviceId: currentPayload.lastServiceId,
            serviceName: currentPayload.lastServiceName,
            staffId: currentPayload.lastStaffId,
            staffName: currentPayload.lastStaffName,
            customerName: existingCustomer.name,
          });

          await this.whatsappService.sendText(
            from,
            `*Perfecto, ${existingCustomer.name}* 👌

📆 Decime la fecha en formato *YYYY-MM-DD*.
*Ejemplo:* 2026-03-21

*Importante:*
- No atendemos domingos
- Solo tomamos turnos desde hoy hasta 30 días en adelante`,
          );
        } else {
          await this.conversationStateService.setState(from, 'ASKING_NAME', {
            serviceId: currentPayload.lastServiceId,
            serviceName: currentPayload.lastServiceName,
            staffId: currentPayload.lastStaffId,
            staffName: currentPayload.lastStaffName,
          });

          await this.whatsappService.sendText(
            from,
            `Elegiste: ${currentPayload.lastServiceName} con ${currentPayload.lastStaffName} ✅\n\nDecime tu nombre.`,
          );
        }
        return;
      }

      if (text === 'repeat_no') {
        const services = await this.servicesService.findAll();

        await this.conversationStateService.setState(from, 'SELECTING_SERVICE');

        await this.whatsappService.sendListMessage(
          from,
          'Elegí el servicio que querés reservar.',
          'Ver servicios',
          services.map((service) => ({
            id: `service_${service.id}`,
            title: service.name,
            description: `$${service.price} • ${service.durationMinutes} min`,
          })),
          {
            headerText: '✂️ Reservar turno',
            footerText: 'Seleccioná un servicio',
            sectionTitle: 'Servicios',
          },
        );
        return;
      }

      await this.whatsappService.sendReplyButtons(
        from,
        `Tu último servicio fue *${currentPayload.lastServiceName}* con *${currentPayload.lastStaffName}*.\n\n¿Querés reservar lo mismo?`,
        [
          { id: 'repeat_yes', title: 'Sí, lo mismo' },
          { id: 'repeat_no', title: 'No, cambiar' },
        ],
        {
          headerText: '✂️ Reservar turno',
          footerText: 'Seleccioná una opción',
        },
      );
      return;
    }

    if (text === '2' || text === 'menu_servicios') {
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

      await this.sendMessageWithNavigationButtons(
        from,
        `💇 *Servicios disponibles:*
${servicesText}`,
        'Servicios',
      );
      return;
    }

    if (text === '3' || text === 'menu_horarios') {
      const config =
        (await this.businessConfigService.getConfig()) ||
        (await this.businessConfigService.createDefaultConfig());

      const openingHours = this.businessConfigService.normalizeOpeningHours(
        config.openingHours,
      );

      const closedDays = this.businessConfigService.normalizeClosedDays(
        config.closedDays,
      );

      const hoursText = WEEKDAY_ORDER.filter(
        (day) => openingHours[day] && !closedDays.includes(day),
      )
        .map((day) => `*${WEEKDAY_LABELS[day]}:* ${openingHours[day]}`)
        .join('\n');

      const closedText = closedDays.length
        ? `\n*${closedDays.map((day) => WEEKDAY_LABELS[day]).join(', ')}* Cerrado:`
        : '';

      await this.sendMessageWithNavigationButtons(
        from,
        `🕘 *Horarios de atención*

${hoursText}${closedText}`,
        'Horarios',
      );
      return;
    }

    if (text === '4' || text === 'menu_barbero') {
      await this.conversationStateService.setState(from, 'WAITING_HUMAN_HELP');

      await this.whatsappService.sendText(
        from,
        `✉️ En breve un barbero te va a responder.

Por favor, escribí ​​✍️​ tu consulta y la dejamos registrada. 👇​`,
      );
      return;
    }

    if (text === '5' || text === 'menu_cancelar') {
      const appointment =
        await this.appointmentsService.findNextAppointmentByCustomerPhone(from);

      if (!appointment) {
        await this.sendMessageWithNavigationButtons(
          from,
          'No encontré turnos futuros confirmados para cancelar.',
          'Cancelar turno',
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

      await this.whatsappService.sendReplyButtons(
        from,
        `Encontré este turno:

Servicio: ${appointment.service.name}
Barbero: ${appointment.staff.name}
Fecha: ${appointmentDate}
Horario: ${appointmentTime}`,
        [
          { id: 'cancel_confirm_yes', title: 'Confirmar' },
          { id: 'cancel_confirm_no', title: 'Volver' },
        ],
        {
          headerText: 'Cancelar turno',
          footerText: 'Elegí una opción',
        },
      );
      return;
    }

    if (text === '6' || text === 'menu_reprogramar') {
      const appointment =
        await this.appointmentsService.findNextAppointmentByCustomerPhone(from);

      if (!appointment) {
        await this.sendMessageWithNavigationButtons(
          from,
          'No encontré turnos futuros confirmados para reprogramar.',
          'Reprogramar turno',
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

      await this.whatsappService.sendReplyButtons(
        from,
        `Encontré este turno:

Servicio: ${appointment.service.name}
Barbero: ${appointment.staff.name}
Fecha: ${appointmentDate}
Horario: ${appointmentTime}`,
        [
          { id: 'reschedule_confirm_yes', title: 'Reprogramar' },
          { id: 'reschedule_confirm_no', title: 'Volver' },
        ],
        {
          headerText: 'Reprogramar turno',
          footerText: 'Elegí una opción',
        },
      );
      return;
    }

    if (currentState?.state === 'JOINING_WAITLIST') {
      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      if (text === 'waitlist_join') {
        const customer = await this.customersService.findOrCreate(
          from,
          currentPayload.customerName as string,
        );

        await this.waitlistService.addToWaitlist(
          customer.id,
          currentPayload.serviceId as string,
          currentPayload.staffId as string,
          currentPayload.selectedDate as string,
        );

        await this.conversationStateService.setState(from, 'MAIN_MENU');

        await this.sendMessageWithNavigationButtons(
          from,
          `✅ *Te anotamos en la lista de espera.*

Te avisaremos por aquí si se libera un turno para el *${currentPayload.selectedDate as string}* con *${currentPayload.staffName as string}*.`,
          'Lista de espera',
        );
        return;
      }

      if (text === 'waitlist_skip') {
        await this.conversationStateService.setState(from, 'ASKING_DATE', {
          serviceId: currentPayload.serviceId,
          serviceName: currentPayload.serviceName,
          staffId: currentPayload.staffId,
          staffName: currentPayload.staffName,
          customerName: currentPayload.customerName,
        });

        await this.whatsappService.sendText(
          from,
          `📆 Elegí otra fecha en formato *YYYY-MM-DD*.`,
        );
        return;
      }

      await this.whatsappService.sendReplyButtons(
        from,
        '¿Querés anotarte en la lista de espera o preferís elegir otra fecha?',
        [
          { id: 'waitlist_join', title: '🔔 Anotarme' },
          { id: 'waitlist_skip', title: '📅 Otra fecha' },
        ],
        { headerText: 'Sin disponibilidad', footerText: 'Lista de espera' },
      );
      return;
    }

    if (currentState?.state === 'WAITLIST_OFFER') {
      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      if (text === 'waitlist_confirm_yes') {
        const offeredDate = currentPayload.offeredDate as string;
        const offeredTime = currentPayload.offeredTime as string;
        const staffId = currentPayload.staffId as string;
        const serviceId = currentPayload.serviceId as string;
        const waitlistId = currentPayload.waitlistId as string;

        // Verificar que el slot sigue disponible
        const startsAt = buildLocalDateTime(offeredDate, offeredTime);
        const existing = await this.appointmentsService.findByStartsAtAndStaff(
          startsAt,
          staffId,
        );

        if (existing) {
          await this.waitlistService.expireEntry(waitlistId);
          await this.conversationStateService.setState(from, 'MAIN_MENU');
          await this.sendMessageWithNavigationButtons(
            from,
            '😔 Lo sentimos, ese turno ya fue ocupado por otra persona. Podés intentar reservar otra fecha.',
            'Turno ocupado',
          );
          return;
        }

        const customer = await this.customersService.findOrCreate(
          from,
          currentPayload.customerName as string,
        );

        await this.appointmentsService.createAppointment({
          customerId: customer.id,
          serviceId,
          staffId,
          startsAt,
        });

        await this.customersService.updateLastService(customer.id, serviceId, staffId);
        await this.waitlistService.markBooked(waitlistId);
        await this.conversationStateService.setState(from, 'BOOKING_CONFIRMED', currentPayload);

        const config =
          (await this.businessConfigService.getConfig()) ||
          (await this.businessConfigService.createDefaultConfig());

        await this.whatsappService.sendText(
          from,
          `✅ *¡Turno confirmado!*

*Servicio:* ${currentPayload.serviceName as string}
*Barbero:* ${currentPayload.staffName as string}
*Fecha:* ${offeredDate}
*Horario:* ${offeredTime}

Gracias por reservar en *${config.businessName}* 💈`,
        );
        return;
      }

      if (text === 'waitlist_confirm_no') {
        await this.waitlistService.expireEntry(currentPayload.waitlistId as string);
        await this.conversationStateService.setState(from, 'MAIN_MENU');
        await this.sendMainMenu(from);
        return;
      }

      // Si no toca el botón, reenviar
      await this.whatsappService.sendReplyButtons(
        from,
        `Hay un turno disponible para vos. ¿Querés reservarlo?`,
        [
          { id: 'waitlist_confirm_yes', title: '✅ Sí, reservar' },
          { id: 'waitlist_confirm_no', title: '❌ No, gracias' },
        ],
        { headerText: '🔔 ¡Turno disponible!', footerText: 'Lista de espera' },
      );
      return;
    }

    if (currentState?.state === 'RATING_SERVICE') {
      const currentPayload =
        currentState?.payload &&
        typeof currentState.payload === 'object' &&
        !Array.isArray(currentState.payload)
          ? (currentState.payload as Record<string, any>)
          : {};

      const ratingMap: Record<string, number> = {
        rating_1: 1,
        rating_2: 2,
        rating_3: 3,
        rating_4: 4,
        rating_5: 5,
      };

      const rating = ratingMap[text];

      if (!rating) {
        await this.whatsappService.sendListMessage(
          from,
          'Por favor seleccioná una opción de la lista para calificar tu visita.',
          'Calificar',
          [
            { id: 'rating_5', title: '⭐⭐⭐⭐⭐ Excelente', description: '' },
            { id: 'rating_4', title: '⭐⭐⭐⭐ Muy bueno', description: '' },
            { id: 'rating_3', title: '⭐⭐⭐ Regular', description: '' },
            { id: 'rating_2', title: '⭐⭐ Malo', description: '' },
            { id: 'rating_1', title: '⭐ Muy malo', description: '' },
          ],
          {
            headerText: '¿Cómo te fue?',
            footerText: 'Tu calificación es anónima',
            sectionTitle: 'Puntuación',
          },
        );
        return;
      }

      try {
        await this.appointmentsService.saveRating(
          currentPayload.appointmentId as string,
          rating,
        );
      } catch {
        // Si el turno ya no existe, igual agradecemos
      }

      await this.conversationStateService.setState(from, 'MAIN_MENU');

      await this.whatsappService.sendText(
        from,
        `¡Gracias por tu calificación! 🙏

Tu opinión nos ayuda a seguir mejorando.
Si necesitás algo más, escribí *"hola"* para volver al menú.`,
      );
      return;
    }

    await this.whatsappService.sendText(
      from,
      'No entendí tu mensaje. Escribí ​​✍️​ *"hola"* o *"menu"* para comenzar. 👇​',
    );
  }
}
