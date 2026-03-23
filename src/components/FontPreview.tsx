const fonts = [
  { name: "Nunito", family: "Nunito" },
  { name: "Quicksand", family: "Quicksand" },
  { name: "Comfortaa", family: "Comfortaa" },
  { name: "Varela Round", family: "Varela Round" },
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
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
              {font.name}
            </p>
            {/* Using a <div> instead of <h3> to avoid global h1-h6 font-family override */}
            <div
              className="text-5xl md:text-6xl font-bold text-foreground mb-3"
              style={{ fontFamily: `'${font.family}', sans-serif` }}
            >
              VBUCKS BARATO
            </div>
            <p
              className="text-lg text-muted-foreground"
              style={{ fontFamily: `'${font.family}', sans-serif` }}
            >
              V-Bucks e contas de jogos com os melhores preços do Brasil. Entrega instantânea e segurança garantida.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FontPreview;
