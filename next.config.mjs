const nextConfig = {
  outputFileTracingIncludes: {
    "/api/plant-metadata": ["./data/eia/builds/phase1b/plants.jsonl.gz"],
    "/api/search-eia": [
      "./data/eia/phase4-concept-taxonomy.json",
      "./data/eia/phase4-ranking-config.json",
      "./data/eia/phase4-routing-config.json",
      "./data/eia/routing-metadata.json",
      "./data/eia/builds/phase1b/manifest.json",
      "./data/eia/builds/phase1b/validation-report.json",
      "./data/eia/builds/phase1b/domestic.jsonl.gz",
      "./data/eia/builds/phase1b/natural-gas.jsonl.gz",
      "./data/eia/builds/phase1b/international.jsonl.gz",
      "./data/eia/builds/phase1b/seds.jsonl.gz"
    ]
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/login.html", destination: "/login", permanent: false }
    ];
  }
};

export default nextConfig;
