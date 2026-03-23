const fonts = [
  { name: "Nunito", family: "'Nunito', sans-serif" },
  { name: "Quicksand", family: "'Quicksand', sans-serif" },
  { name: "Comfortaa", family: "'Comfortaa', sans-serif" },
  { name: "Varela Round", family: "'Varela Round', sans-serif" },
];

const FontPreview = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto space-y-10">
        <h2 className="text-center text-sm uppercase tracking-[0.2em] text-primary font-semibold mb-12">
          Escolha sua fonte favorita
        </h2>
        {fonts.map((font) => (
          <div
            key={font.name}
            className="rounded-2xl border border-border/40 bg-card/50 p-8 backdrop-blur-sm"
            style={{ fontFamily: font.family }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
              {font.name}
            </p>
            <h3 className="text-5xl md:text-6xl font-bold text-foreground mb-3">
              VBUCKS BARATO
            </h3>
            <p className="text-lg text-muted-foreground">
              V-Bucks e contas de jogos com os melhores preços do Brasil. Entrega instantânea e segurança garantida.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FontPreview;
