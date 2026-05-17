export const workerAuthAppearance = {
  variables: {
    colorPrimary: '#059669',
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#0f172a',
    borderRadius: '14px',
    fontFamily: 'var(--font-jakarta), var(--font-geist-sans), sans-serif',
  },
  elements: {
    rootBox: 'mx-auto w-full',
    card: 'w-full border-0 bg-white p-0 shadow-none',
    header: 'hidden',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton:
      '!h-11 !rounded-xl !border !border-slate-300 !bg-white !text-slate-900 hover:!bg-slate-50',
    socialButtonsBlockButtonText: '!text-sm !font-semibold !text-slate-900',
    dividerLine: '!bg-slate-200',
    dividerText: '!text-xs !font-semibold !uppercase !tracking-widest !text-slate-500',
    formFieldLabel: '!text-sm !font-semibold !text-slate-700',
    formFieldInput:
      '!h-11 !rounded-xl !border !border-slate-300 !bg-white !px-3 !text-base !font-medium !text-slate-950 placeholder:!text-slate-500 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-100',
    formFieldInputShowPasswordButton: '!text-slate-500 hover:!text-slate-800',
    formButtonPrimary:
      '!h-11 !rounded-xl !bg-emerald-600 !text-sm !font-bold !text-white !shadow-lg !shadow-emerald-600/20 hover:!bg-emerald-700',
    footer: '!bg-white',
    footerAction: '!text-sm !text-slate-600',
    footerActionLink: '!font-bold !text-emerald-700 hover:!text-emerald-800',
    identityPreview: '!rounded-xl !border !border-slate-200 !bg-slate-50',
    identityPreviewText: '!text-slate-900',
    identityPreviewEditButton: '!font-semibold !text-emerald-700',
    formResendCodeLink: '!font-semibold !text-emerald-700',
    formFieldErrorText: '!text-sm !font-semibold !text-red-600',
    alert: '!rounded-xl !border !border-red-200 !bg-red-50 !text-red-700',
  },
} as const
