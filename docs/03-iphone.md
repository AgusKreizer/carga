# App nativa para iPhone

El proyecto ya tiene la plataforma iOS (`ios/`), íconos, splash, esquema `ar.carga.app://` para el login y permisos de cámara y fotos. Desde Windows no se puede compilar iOS: se compila en la nube con Codemagic y se instala con TestFlight.

## Lo que tiene que hacer Agus (una sola vez, ~40 min + espera de Apple)

1. **Apple Developer Program** (USD 99/año): https://developer.apple.com/programs/enroll con tu Apple ID. Apple puede tardar 24–48 h en aprobar.
2. **Crear la app** en App Store Connect → Apps → "+" → Nueva app: plataforma iOS, nombre "Carga", idioma español, bundle ID `ar.carga.app` (si no aparece, crearlo antes en developer.apple.com → Identifiers), SKU `carga`. Copiar el **Apple ID** numérico que muestra la app.
3. **API key**: App Store Connect → Usuarios y acceso → Integraciones → App Store Connect API → generar clave con rol **App Manager**. Descargar el `.p8` (se baja una sola vez) y anotar **Issuer ID** y **Key ID**.
4. **Codemagic** (gratis, 500 min/mes): https://codemagic.io → entrar con GitHub → agregar el repo `AgusKreizer/carga`. En Team settings → Integrations → App Store Connect: cargar Issuer ID, Key ID y el `.p8` con el nombre **carga_asc**.
5. Pasarle a Claude el Apple ID numérico de la app (no es secreto) para ponerlo en `codemagic.yaml`.

## Compilar y publicar a TestFlight

Desde la carpeta del proyecto:

```
git tag ios-1.0.0
git push origin ios-1.0.0
```

Codemagic compila (~15 min) y sube a TestFlight. En el iPhone: instalar la app **TestFlight** desde el App Store → aceptar la invitación (llega al mail del Apple ID) → instalar Carga. Para amigos: TestFlight → Grupos externos, hasta 10.000 testers con un link público (la primera build externa pasa una revisión corta de Apple).

## Qué cambia respecto de la versión web en Safari

- Notificación de fin de descanso y recordatorios semanales nativos (no dependen de Safari).
- Háptica real, menú de compartir nativo, login por link de mail que vuelve a la app.
- **Pendiente** (requiere código Swift y una Mac o más configuración en la nube): Live Activity en la pantalla de bloqueo con serie y descanso, y lectura de horas de sueño desde Apple Salud.
