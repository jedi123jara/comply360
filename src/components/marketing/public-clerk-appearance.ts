/**
 * Apariencia de Clerk (<SignIn />, <SignUp />) alineada al tema público:
 * tarjeta blanca con borde #E5EAF2, títulos azul marino, botón principal ámbar
 * con texto azul marino y enlaces en azul.
 *
 * - Los colores van en `variables` (Clerk los aplica con su propio CSS, que tiene
 *   prioridad sobre las utilidades normales de Tailwind).
 * - Clerk v7 renombró varias variables (`colorText` → `colorForeground`,
 *   `colorInputBackground` → `colorInput`, etc.). Se envían ambos nombres para
 *   que el tema funcione con cualquier versión de clerk-js que cargue el CDN.
 * - Enlaces: Clerk los pinta con `colorPrimary`; ámbar sobre blanco da 1.85:1
 *   (no cumple AA), así que se fijan en azul #1D4ED8 (6.7:1) vía `elements`.
 * - Inputs: `globals.css` pinta todos los inputs con fondo oscuro (esa regla ha
 *   estado con y sin capa); aquí van con `!important` para que la tarjeta blanca
 *   de Clerk tenga inputs blancos en cualquier caso.
 */
import { PUBLIC_COLORS } from './public-theme'

const inputStyle = {
  backgroundColor: `${PUBLIC_COLORS.surface} !important`,
  color: `${PUBLIC_COLORS.title} !important`,
  borderColor: `${PUBLIC_COLORS.inputBorder} !important`,
  colorScheme: 'light !important',
}

const linkStyle = {
  color: PUBLIC_COLORS.blueHover,
  fontWeight: 600,
  '&:hover': { color: PUBLIC_COLORS.navy, textDecoration: 'underline' },
}

export const publicClerkAppearance = {
  variables: {
    colorPrimary: PUBLIC_COLORS.amber,
    colorPrimaryForeground: PUBLIC_COLORS.navy,
    colorForeground: PUBLIC_COLORS.title,
    colorMutedForeground: PUBLIC_COLORS.text,
    colorBackground: PUBLIC_COLORS.surface,
    colorInput: PUBLIC_COLORS.surface,
    colorInputForeground: PUBLIC_COLORS.title,
    colorNeutral: PUBLIC_COLORS.navy,
    colorDanger: PUBLIC_COLORS.danger,
    colorSuccess: PUBLIC_COLORS.success,
    colorWarning: PUBLIC_COLORS.warning,
    // Nombres anteriores (Clerk Core 2)
    colorText: PUBLIC_COLORS.title,
    colorTextSecondary: PUBLIC_COLORS.text,
    colorTextOnPrimaryBackground: PUBLIC_COLORS.navy,
    colorInputBackground: PUBLIC_COLORS.surface,
    colorInputText: PUBLIC_COLORS.title,
    borderRadius: '10px',
    fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    // Clerk fija 25rem (400 px): en un celular de 375 px la tarjeta se recortaba.
    rootBox: { width: '100%', maxWidth: '25rem', marginInline: 'auto' },
    cardBox: {
      width: '100%',
      maxWidth: '100%',
      border: `1px solid ${PUBLIC_COLORS.border}`,
      boxShadow: '0 1px 2px rgba(11, 27, 54, 0.04), 0 18px 48px rgba(11, 27, 54, 0.12)',
    },
    card: { width: '100%' },
    headerTitle: { fontWeight: 800, letterSpacing: '-0.02em' },
    formButtonPrimary: {
      fontWeight: 700,
      '&:hover': { backgroundColor: PUBLIC_COLORS.amberHover },
    },
    formFieldInput: inputStyle,
    otpCodeFieldInput: inputStyle,
    footerActionLink: linkStyle,
    formFieldAction: linkStyle,
    formResendCodeLink: linkStyle,
    identityPreviewEditButton: linkStyle,
  },
}
