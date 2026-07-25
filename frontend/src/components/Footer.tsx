export default function Footer() {
  return (
    <footer className="w-full border-t border-border-light dark:border-border-dark py-8">
      <p className="text-center text-sm text-black/60 dark:text-white/60">
        © Copyright{" "}
        <a
          href="https://ilaikoto.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-black dark:text-white hover:text-accent transition-colors"
        >
          ILAIKOTO
        </a>{" "}
        2026
      </p>
    </footer>
  );
}
