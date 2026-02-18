import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sun6bks-dark">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Standupindo Bekasi Events
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Buat akun baru
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-gray-900 border border-white/10 shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton:
                "border-white/10 text-white hover:bg-white/5",
              socialButtonsBlockButtonText: "text-white font-medium",
              formFieldLabel: "text-gray-300",
              formFieldInput:
                "bg-white/5 border-white/10 text-white placeholder-gray-500",
              formButtonPrimary:
                "bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange text-sun6bks-dark font-bold hover:opacity-90",
              footerActionLink: "text-sun6bks-gold hover:text-sun6bks-orange",
              identityPreviewEditButton: "text-sun6bks-gold",
              formFieldAction: "text-sun6bks-gold",
            },
          }}
        />
      </div>
    </div>
  );
}
