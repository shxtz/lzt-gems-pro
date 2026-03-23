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
        {fonts.map((font, index) => {
          const id = `font-preview-${index}`;
          return (
            <div
              key={font.name}
              id={id}
              className="rounded-2xl border border-border/40 bg-card/50 p-8 backdrop-blur-sm"
            >
              <style>{`
                #${id} * {
                  font-family: '${font.family}', sans-serif !important;
                }
              `}</style>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
                {font.name}
              </p>
              <div className="text-5xl md:text-6xl font-bold text-foreground mb-3">
                VBUCKS BARATO
              </div>
              <p className="text-lg text-muted-foreground">
                V-Bucks e contas de jogos com os melhores preços do Brasil. Entrega instantânea e segurança garantida.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FontPreview;
