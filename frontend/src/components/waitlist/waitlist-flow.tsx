"use client"

import { X, UserPlus, Check, AlertCircle } from "lucide-react"

export interface WaitlistFlowProps {
  state: "hidden" | "toast" | "form" | "success"
  type: "extended_usage" | "api_access" | "conversation_intelligence"
  email: string
  useCase?: string
  volume?: string
  source?: string
  languagePreference?: string
  languagePreferenceOther?: string
  isSubmitting?: boolean
  onEmailChange: (email: string) => void
  onUseCaseChange?: (useCase: string) => void
  onVolumeChange?: (volume: string) => void
  onSourceChange?: (source: string) => void
  onLanguagePreferenceChange?: (value: string) => void
  onLanguagePreferenceOtherChange?: (value: string) => void
  onSubmit: () => void
  onClose: () => void
  onOpenForm?: () => void
  t: (key: string) => string
}

export function WaitlistFlow({
  state,
  type,
  email,
  useCase,
  volume,
  source,
  languagePreference,
  languagePreferenceOther,
  isSubmitting,
  onEmailChange,
  onUseCaseChange,
  onVolumeChange,
  onSourceChange,
  onLanguagePreferenceChange,
  onLanguagePreferenceOtherChange,
  onSubmit,
  onClose,
  onOpenForm: _onOpenForm,
  t,
}: WaitlistFlowProps) {
  const isExtendedUsage = type === "extended_usage" || type === "conversation_intelligence"
  const isApiAccess = type === "api_access"

  return (
    <>
      {/* Toast Notification */}
      <div
        role="alert"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] max-w-[500px] w-[calc(100%-48px)] bg-[linear-gradient(135deg,#0F172A_0%,#1E293B_100%)] rounded-2xl p-4 flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          state === "toast" ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0"
        }`}
      >
        <div className="w-11 h-11 bg-[linear-gradient(135deg,#FEF3C7_0%,#FDE68A_100%)] rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 stroke-[#B45309]" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="text-[15px] font-bold text-white mb-0.5">
            {isExtendedUsage ? t("waitlist.toast.rateLimitTitle") : t("waitlist.toast.apiAccessTitle")}
          </div>
          <div className="text-[13px] text-white/70">
            {isExtendedUsage ? t("waitlist.toast.rateLimitSubtitle") : t("waitlist.toast.apiAccessSubtitle")}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
          <button
            onClick={onClose}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white rounded-[10px] text-[13px] font-semibold transition-all"
          >
            {t("waitlist.toast.later")}
          </button>
          <button
            onClick={() => {}}
            className="flex-1 md:flex-none px-4 py-2.5 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] hover:shadow-[0_4px_12px_rgba(56,189,248,0.3)] hover:-translate-y-px text-white rounded-[10px] text-[13px] font-semibold transition-all"
          >
            {t("waitlist.toast.joinWaitlist")}
          </button>
        </div>
      </div>

      {/* Modal Overlay */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        className={`fixed inset-0 z-[2000] bg-[rgba(15,23,42,0.7)] backdrop-blur-sm flex items-center justify-center p-6 transition-all duration-300 ease-in-out ${
          state === "form" || state === "success" ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div
          className={`bg-white rounded-3xl w-full max-w-[440px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.2)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            state === "form" || state === "success" ? "scale-100 translate-y-0" : "scale-95 translate-y-5"
          }`}
        >
          {/* Modal Header */}
          <div className="bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_100%)] px-6 md:px-8 pt-8 pb-7 text-center relative flex-shrink-0">
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
            >
              <X className="w-[18px] h-[18px] stroke-white/70" strokeWidth={2} />
            </button>
            <div className="w-16 h-16 bg-[linear-gradient(135deg,rgba(56,189,248,0.2)_0%,rgba(168,85,247,0.2)_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-5">
              <UserPlus className="w-8 h-8 stroke-[#38BDF8]" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">
              {isApiAccess ? t("waitlist.modal.titleApi") : t("waitlist.modal.titleExtended")}
            </h2>
            <p className="text-[15px] text-white/70 leading-relaxed">
              {isApiAccess
                ? t("waitlist.modal.subtitleApi")
                : t("waitlist.modal.subtitleExtended")}
            </p>
          </div>

          {/* Modal Body - Form */}
          {state === "form" && (
            <div className="px-6 md:px-8 pt-7 pb-8 overflow-y-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onSubmit()
                }}
              >
                {/* Email Field */}
                <div className="mb-5">
                  <label
                    htmlFor="waitlist-email"
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-[#374151] mb-2"
                  >
                    {t("waitlist.modal.emailLabel")}
                    <span className="text-[#DC2626]" aria-label="required">
                      *
                    </span>
                  </label>
                  <input
                    type="email"
                    id="waitlist-email"
                    required
                    aria-required="true"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder={t("waitlist.modal.emailPlaceholder")}
                    className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl text-[15px] bg-[#F8FAFC] transition-all focus:outline-none focus:border-[#38BDF8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.1)] placeholder:text-[#94A3B8]"
                  />
                </div>

                {/* Language Preference Field */}
                <div className="mb-5">
                  <label
                    htmlFor="waitlist-language"
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-[#374151] mb-2"
                  >
                    {t("waitlist.modal.languageLabel")}
                    <span className="text-[#DC2626]" aria-label="required">
                      *
                    </span>
                  </label>
                  <select
                    id="waitlist-language"
                    required
                    aria-required="true"
                    value={languagePreference}
                    onChange={(e) => onLanguagePreferenceChange?.(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl text-[15px] bg-[#F8FAFC] transition-all focus:outline-none focus:border-[#38BDF8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.1)]"
                  >
                    <option value="">{t("waitlist.modal.languagePlaceholder")}</option>
                    <option value="en">{t("waitlist.modal.languageOptions.en")}</option>
                    <option value="fr">{t("waitlist.modal.languageOptions.fr")}</option>
                    <option value="de">{t("waitlist.modal.languageOptions.de")}</option>
                    <option value="es">{t("waitlist.modal.languageOptions.es")}</option>
                    <option value="sl">{t("waitlist.modal.languageOptions.sl")}</option>
                    <option value="other">{t("waitlist.modal.languageOptions.other")}</option>
                  </select>
                  <div className="mt-1.5 text-[12px] text-[#64748B]">
                    {t("waitlist.modal.languageHelp")}
                  </div>
                </div>

                {/* Language Other Input (shown when "other" is selected) */}
                {languagePreference === "other" && (
                  <div className="mb-5">
                    <input
                      type="text"
                      id="waitlist-language-other"
                      required
                      aria-required="true"
                      value={languagePreferenceOther}
                      onChange={(e) => onLanguagePreferenceOtherChange?.(e.target.value)}
                      placeholder={t("waitlist.modal.languageOtherPlaceholder")}
                      className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl text-[15px] bg-[#F8FAFC] transition-all focus:outline-none focus:border-[#38BDF8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.1)] placeholder:text-[#94A3B8]"
                    />
                  </div>
                )}

                {/* Use Case Field - now uses prop value and callback */}
                <div className="mb-5">
                  <label
                    htmlFor="waitlist-usecase"
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-[#374151] mb-2"
                  >
                    {isApiAccess ? t("waitlist.modal.useCaseLabelApi") : t("waitlist.modal.useCaseLabelExtended")}
                    <span className="text-[#DC2626]" aria-label="required">
                      *
                    </span>
                  </label>
                  {isApiAccess ? (
                    <textarea
                      id="waitlist-usecase"
                      required
                      aria-required="true"
                      value={useCase}
                      onChange={(e) => onUseCaseChange?.(e.target.value)}
                      placeholder={t("waitlist.modal.useCasePlaceholderApi")}
                      className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl text-[15px] bg-[#F8FAFC] min-h-[80px] resize-vertical transition-all focus:outline-none focus:border-[#38BDF8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.1)] placeholder:text-[#94A3B8]"
                    />
                  ) : (
                    <select
                      id="waitlist-usecase"
                      required
                      aria-required="true"
                      value={useCase}
                      onChange={(e) => onUseCaseChange?.(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl text-[15px] bg-[#F8FAFC] transition-all focus:outline-none focus:border-[#38BDF8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.1)]"
                    >
                      <option value="">{t("waitlist.modal.useCasePlaceholderExtended")}</option>
                      <option value="therapy">{t("waitlist.modal.useCaseOptions.therapy")}</option>
                      <option value="research">{t("waitlist.modal.useCaseOptions.research")}</option>
                      <option value="journalism">{t("waitlist.modal.useCaseOptions.journalism")}</option>
                      <option value="podcasting">{t("waitlist.modal.useCaseOptions.podcasting")}</option>
                      <option value="other">{t("waitlist.modal.useCaseOptions.other")}</option>
                    </select>
                  )}
                  <div className="mt-1.5 text-[12px] text-[#64748B]">
                    {isApiAccess ? t("waitlist.modal.useCaseHelpApi") : t("waitlist.modal.useCaseHelpExtended")}
                  </div>
                </div>

                {/* Volume Field (API Access Only) - now uses prop value and callback */}
                {isApiAccess && (
                  <div className="mb-5">
                    <label
                      htmlFor="waitlist-volume"
                      className="flex items-center gap-1.5 text-[13px] font-semibold text-[#374151] mb-2"
                    >
                      {t("waitlist.modal.volumeLabel")}
                      <span className="text-[#94A3B8] font-normal">{t("waitlist.modal.volumeOptional")}</span>
                    </label>
                    <select
                      id="waitlist-volume"
                      value={volume}
                      onChange={(e) => onVolumeChange?.(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl text-[15px] bg-[#F8FAFC] transition-all focus:outline-none focus:border-[#38BDF8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.1)]"
                    >
                      <option value="">{t("waitlist.modal.volumePlaceholder")}</option>
                      <option value="0-100">{t("waitlist.modal.volumeOptions.0-100")}</option>
                      <option value="100-500">{t("waitlist.modal.volumeOptions.100-500")}</option>
                      <option value="500-2000">{t("waitlist.modal.volumeOptions.500-2000")}</option>
                      <option value="2000+">{t("waitlist.modal.volumeOptions.2000+")}</option>
                    </select>
                  </div>
                )}

                {/* Source Field - now uses prop value and callback */}
                <div className="mb-5">
                  <label
                    htmlFor="waitlist-source"
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-[#374151] mb-2"
                  >
                    {t("waitlist.modal.sourceLabel")}
                    <span className="text-[#94A3B8] font-normal">{t("waitlist.modal.volumeOptional")}</span>
                  </label>
                  <input
                    type="text"
                    id="waitlist-source"
                    value={source}
                    onChange={(e) => onSourceChange?.(e.target.value)}
                    placeholder={t("waitlist.modal.sourcePlaceholder")}
                    className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl text-[15px] bg-[#F8FAFC] transition-all focus:outline-none focus:border-[#38BDF8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.1)] placeholder:text-[#94A3B8]"
                  />
                </div>

                {/* Submit Button - uses isSubmitting prop */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] hover:shadow-[0_8px_24px_rgba(56,189,248,0.4)] hover:-translate-y-0.5 text-white text-base font-bold rounded-xl transition-all shadow-[0_4px_16px_rgba(56,189,248,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {isSubmitting ? t("waitlist.modal.submitting") : t("waitlist.modal.submit")}
                </button>

                {/* Privacy Footer */}
                <div className="text-center mt-4 text-[12px] text-[#94A3B8]">
                  {t("waitlist.modal.privacyNote")}{" "}
                  <a href="#" className="text-[#64748B] underline hover:text-[#0F172A]">
                    {t("waitlist.modal.privacyLink")}
                  </a>
                </div>
              </form>
            </div>
          )}

          {/* Modal Body - Success */}
          {state === "success" && (
            <div className="px-6 md:px-8 pt-7 pb-8 overflow-y-auto">
              {/* Success Icon */}
              <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,#DCFCE7_0%,#BBF7D0_100%)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-9 h-9 stroke-[#16A34A]" strokeWidth={3} aria-hidden="true" />
              </div>

              {/* Success Message */}
              <h3 className="text-[22px] font-extrabold text-[#0F172A] text-center mb-2">{t("waitlist.success.title")}</h3>
              <p className="text-[15px] text-[#64748B] text-center mb-7 leading-relaxed">
                {t("waitlist.success.subtitle")}
              </p>

              {/* Done Button */}
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-[15px] font-semibold rounded-xl transition-all"
              >
                {t("waitlist.success.done")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
