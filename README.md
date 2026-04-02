# Barber Bot — Sistema de Turnos para Barberías

Sistema completo de gestión de turnos para barberías, con chatbot de WhatsApp y panel de administración web.

---

## Descripción general

**Barber Bot** permite a los clientes reservar, cancelar y reprogramar turnos directamente desde WhatsApp, sin necesidad de llamar ni instalar ninguna app. El personal de la barbería gestiona todo desde un panel web.

### Componentes

| Componente | Tecnología | Descripción |
|---|---|---|
| `barber-bot-api/` | NestJS + PostgreSQL | API REST + lógica del chatbot |
| `frontend/` | React + Vite | Panel de administración web |

---

## Stack tecnológico

### Backend
- **NestJS 11** — framework modular con TypeScript
- **Prisma ORM 6** — esquema de base de datos y cliente tipado
- **PostgreSQL** vía [Supabase](https://supabase.com) — base de datos en la nube
- **Meta WhatsApp Business API** — envío y recepción de mensajes
- **@nestjs/schedule** — cron jobs para recordatorios y feedback

### Frontend
- **React 18** + **Vite 6**
- **RSuite 5** — componentes UI (tablas, drawers, toggles)
- **TanStack React Query 5** — fetching y caché de datos
- **React Router 7** — navegación SPA
- **Axios** — cliente HTTP

---

## Funcionalidades

### Bot de WhatsApp
- Reserva de turnos paso a paso (servicio → barbero → fecha → hora → confirmación)
- Cancelación y reprogramación de turnos activos
- Consulta de servicios con precios y duración
- Consulta de horarios de atención
- Lista de espera automática cuando no hay slots disponibles
- Calificación post-turno (1-5 estrellas) mediante mensaje interactivo

### Panel de administración
- Dashboard con estadísticas del día
- Gestión de turnos: ver, crear, cancelar, reprogramar
- Gestión de barberos: alta, baja, horarios personalizados por día
- Gestión de servicios: nombre, precio, duración
- Gestión de clientes: historial de turnos, notas internas
- Configuración del negocio: horarios, días cerrados, ventana de reserva, mensaje de bienvenida

### Automatizaciones (cron cada 5 min)
- Recordatorio 24 horas antes del turno
- Recordatorio 2 horas antes del turno
- Solicitud de calificación 24 horas después del turno
- Notificación automática a lista de espera al cancelarse un turno

---

## Estructura del proyecto

```
Barber bot API/
├── barber-bot-api/          # Backend NestJS
│   ├── src/
│   │   ├── appointments/    # Gestión de turnos
│   │   ├── bot/             # Motor de conversación del chatbot
│   │   ├── business-config/ # Configuración del negocio
│   │   ├── common/          # Utilidades y constantes compartidas
│   │   ├── conversation-state/ # Estado de conversaciones WhatsApp
│   │   ├── customers/       # Gestión de clientes
│   │   ├── prisma/          # Módulo Prisma (conexión DB)
│   │   ├── reminders/       # Cron jobs de recordatorios y feedback
│   │   ├── services/        # Catálogo de servicios
│   │   ├── staff/           # Gestión de barberos y disponibilidad
│   │   ├── waitlist/        # Lista de espera
│   │   ├── whatsapp/        # Integración con Meta API
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── prisma/
│       └── schema.prisma    # Esquema de la base de datos
└── frontend/                # Panel de administración React
    └── src/
        ├── app/
        ├── components/
        ├── hooks/
        ├── pages/
        ├── services/
        ├── types/
        └── utils/
```

---

## Configuración e instalación

### Requisitos previos
- Node.js 20+
- Cuenta de Supabase (PostgreSQL)
- Cuenta de Meta for Developers con WhatsApp Business API configurada

### Backend

```bash
cd barber-bot-api
npm install
```

Crear archivo `.env` con las siguientes variables:

```env
PORT=3000

# Meta WhatsApp Business API
META_VERIFY_TOKEN=tu_token_de_verificacion
META_ACCESS_TOKEN=tu_access_token
META_PHONE_NUMBER_ID=tu_phone_number_id

# Supabase PostgreSQL (connection pooler)
DATABASE_URL="postgresql://usuario:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://usuario:password@host:5432/postgres"
```

> **Nota:** `DATABASE_URL` usa el puerto 6543 (PgBouncer/pooler de Supabase). `DIRECT_URL` usa el puerto 5432 para migraciones de Prisma.

Sincronizar esquema con la base de datos:

```bash
npx prisma db push
```

Iniciar en desarrollo:

```bash
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
```

Crear archivo `.env`:

```env
VITE_API_URL=http://localhost:3000
```

Iniciar en desarrollo:

```bash
npm run dev
```

---

## Base de datos

### Modelos principales

#### Customer
```prisma
model Customer {
  id            String        @id @default(cuid())
  phone         String        @unique   // número WhatsApp normalizado
  name          String?
  notes         String?                 // notas internas del admin
  lastServiceId String?
  lastStaffId   String?
  createdAt     DateTime      @default(now())
  appointments  Appointment[]
  waitlistEntries Waitlist[]
}
```

#### Appointment
```prisma
model Appointment {
  id                String    @id @default(cuid())
  customerId        String
  serviceId         String
  staffId           String
  startsAt          DateTime
  status            String    @default("confirmed")  // confirmed | cancelled
  reminder24hSentAt DateTime?
  reminder2hSentAt  DateTime?
  feedbackSentAt    DateTime?
  rating            Int?                             // 1-5 estrellas
  createdAt         DateTime  @default(now())
}
```

#### StaffAvailability
```prisma
model StaffAvailability {
  id          String   @id @default(cuid())
  staffId     String
  dayOfWeek   Int      // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  isAvailable Boolean  @default(true)
  startTime   String?  // "09:00"
  endTime     String?  // "18:00"
  staff       Staff    @relation(...)
  @@unique([staffId, dayOfWeek])
}
```

#### Waitlist
```prisma
model Waitlist {
  id            String    @id @default(cuid())
  customerId    String
  serviceId     String
  staffId       String?
  requestedDate String    // "YYYY-MM-DD"
  status        String    @default("WAITING") // WAITING | NOTIFIED | BOOKED | EXPIRED
  offeredDate   String?
  offeredTime   String?
  notifiedAt    DateTime?
  createdAt     DateTime  @default(now())
}
```

#### BusinessConfig
```prisma
model BusinessConfig {
  id                String   @id @default(cuid())
  businessName      String
  welcomeMessage    String?
  address           String?
  phone             String?
  bookingWindowDays Int      @default(30)
  openingHours      Json?    // { lunes: { open: "09:00", close: "18:00" }, ... }
  closedDays        Json?    // ["sabado", "domingo"]
  bookingSlots      Json?    // ["09:00", "10:00", "11:00", ...]
}
```

---

## API REST

### Appointments — `/appointments`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/appointments` | Todos los turnos |
| GET | `/appointments/by-date?date=YYYY-MM-DD` | Turnos de una fecha |
| GET | `/appointments/:id` | Turno por ID |
| PATCH | `/appointments/:id/cancel` | Cancelar turno (notifica lista de espera) |

### Staff — `/staff`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/staff` | Todos los barberos (con avgRating, totalRatings) |
| GET | `/staff/active` | Solo barberos activos |
| GET | `/staff/:id` | Barbero por ID |
| POST | `/staff` | Crear barbero |
| PATCH | `/staff/:id` | Actualizar barbero |
| PATCH | `/staff/:id/toggle-active` | Activar/desactivar barbero |
| GET | `/staff/:id/availability` | Horarios semanales |
| PUT | `/staff/:id/availability` | Actualizar horarios semanales |

### Services — `/services`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/services` | Todos los servicios (con avgRating, totalRatings) |
| GET | `/services/:id` | Servicio por ID |
| POST | `/services` | Crear servicio |
| PATCH | `/services/:id` | Actualizar servicio |

### Customers — `/customers`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/customers` | Todos los clientes |
| GET | `/customers/:id` | Cliente por ID |
| PATCH | `/customers/:id/notes` | Actualizar notas |

### Business Config — `/business-config`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/business-config` | Obtener configuración |
| PATCH | `/business-config` | Actualizar configuración |

### WhatsApp Webhook — `/webhook`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/webhook` | Verificación del webhook (Meta) |
| POST | `/webhook` | Recepción de mensajes entrantes |

---

## Flujo del chatbot

### Estados de la conversación (`ConversationState.state`)

```
MAIN_MENU
  ├── menu_reservar ──────────────────────────────┐
  ├── menu_servicios → muestra servicios           │
  ├── menu_horarios → muestra horarios             │
  ├── menu_barbero → deja consulta                 │
  ├── menu_cancelar → SELECTING_CANCEL             │
  └── menu_reprogramar → SELECTING_RESCHEDULE      │
                                                   ▼
                                         SELECTING_SERVICE
                                                   │
                                                   ▼
                                          SELECTING_STAFF
                                                   │
                                          (si no tiene nombre)
                                                   ▼
                                            ASKING_NAME
                                                   │
                                                   ▼
                                            ASKING_DATE
                                            (valida: formato,
                                             no pasado, no domingo,
                                             ventana de reserva,
                                             disponibilidad del barbero)
                                                   │
                                     ┌─────────────┴─────────────┐
                                  hay slots                  no hay slots
                                     │                           │
                                     ▼                           ▼
                              SELECTING_TIME              JOINING_WAITLIST
                                     │                      (botones:
                                     ▼                    Anotarme / Otra fecha)
                             ASKING_CONFIRMATION
                             (confirmar / cancelar)
                                     │
                                     ▼
                               turno confirmado
                               → MAIN_MENU
```

### Flujo de lista de espera

```
Cliente en JOINING_WAITLIST
  ├── "Anotarme" → addToWaitlist → confirmación → MAIN_MENU
  └── "Otra fecha" → volver a ASKING_DATE

Turno cancelado (bot o admin panel)
  └── checkAndNotifyForSlot()
        └── primer WAITING del slot → envía botones → WAITLIST_OFFER
              ├── "Confirmar" → verificar slot libre → crear turno → MAIN_MENU
              │                  (si ya fue tomado → EXPIRED + disculpas)
              └── "No gracias" → EXPIRED → MAIN_MENU
```

### Flujo de calificación post-turno

```
Cron (cada 5 min) detecta turnos confirmados hace 24h sin feedbackSentAt
  └── envía lista de opciones (1★ al 5★)
        → estado RATING_SERVICE { appointmentId }

Cliente responde rating_1..rating_5
  └── saveRating(appointmentId, rating) → MAIN_MENU
```

---

## Automatizaciones (RemindersService)

El servicio corre un cron cada 5 minutos (`*/5 * * * *`) y ejecuta tres tareas:

| Tarea | Ventana de tiempo | Condición |
|---|---|---|
| Recordatorio 24h | `now + 23h55m` a `now + 24h` | `reminder24hSentAt IS NULL` |
| Recordatorio 2h | `now + 1h55m` a `now + 2h` | `reminder2hSentAt IS NULL` |
| Feedback post-turno | `now - 24h5m` a `now - 24h` | `feedbackSentAt IS NULL`, status=confirmed |

---

## Panel de administración

### Páginas

| Ruta | Página | Descripción |
|---|---|---|
| `/dashboard` | Dashboard | Estadísticas del día, próximos turnos |
| `/appointments` | Turnos | Tabla filtrable por fecha, alta/cancelación/reprogramación |
| `/staff` | Barberos | CRUD, toggle activo, horarios por día, promedio de calificaciones |
| `/services` | Servicios | CRUD, promedio de calificaciones |
| `/customers` | Clientes | Historial de turnos, notas |
| `/business-config` | Configuración | Horarios, días cerrados, slots, mensaje de bienvenida |

### Componentes destacados

- **StaffAvailabilityDrawer** — editor de horarios semanales por barbero: toggle Trabaja/No trabaja, hora de inicio y fin personalizadas
- **ScheduleEditor** — editor de horarios generales del negocio, días cerrados y slots de reserva
- **AppointmentFormDrawer** — creación y reprogramación de turnos desde el panel
- **RatingCell** — muestra `⭐ 4.2 (12)` para barberos y servicios

---

## Configuración de WhatsApp Business API

1. Crear una app en [Meta for Developers](https://developers.facebook.com)
2. Agregar el producto **WhatsApp**
3. Configurar el webhook apuntando a `https://tu-dominio.com/webhook`
4. Suscribirse al evento `messages`
5. Completar las variables de entorno del backend

Para desarrollo local, usar [ngrok](https://ngrok.com) o similar para exponer el puerto 3000.

---

## Convenciones del código

- **Módulos NestJS**: cada dominio tiene su propio módulo (`appointments.module.ts`) con service, controller y DTOs
- **DTOs con class-validator**: toda entrada al API es validada con decoradores `@IsString()`, `@IsInt()`, etc.
- **Fire-and-forget**: notificaciones de lista de espera se llaman con `void` para no bloquear la respuesta
- **Normalización de teléfonos**: los números argentinos `549XXXXXXXX` se normalizan a `54XXXXXXXX`
- **Fechas**: siempre `YYYY-MM-DD` como string para fechas sin hora; `DateTime` de Prisma para timestamps
- **Prisma `db push`**: se usa en lugar de `migrate` por compatibilidad con el pooler de Supabase

---

## Variables de entorno — referencia completa

### Backend (`barber-bot-api/.env`)

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (default: 3000) |
| `META_VERIFY_TOKEN` | Token de verificación del webhook de Meta |
| `META_ACCESS_TOKEN` | Token de acceso a la API de WhatsApp |
| `META_PHONE_NUMBER_ID` | ID del número de teléfono en Meta |
| `DATABASE_URL` | URL de conexión PostgreSQL con pgbouncer (puerto 6543) |
| `DIRECT_URL` | URL directa PostgreSQL para Prisma CLI (puerto 5432) |

### Frontend (`frontend/.env`)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API backend |
