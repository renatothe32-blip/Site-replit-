import "./globals.css";

export const metadata = {
  title: "RA Studio",
  description: "Plataforma SaaS para editar e executar projetos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-black dark:bg-gray-900 dark:text-white">
        <header className="p-4 border-b dark:border-gray-800">
          <div className="max-w-6xl mx-auto">RA Studio</div>
        </header>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
