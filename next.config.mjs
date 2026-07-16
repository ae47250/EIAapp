const nextConfig = {
  outputFileTracingIncludes: {
    "/api/plant-metadata": ["./data/eia/builds/phase1b/plants.jsonl.gz"]
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/login.html", destination: "/login", permanent: false }
    ];
  }
};

export default nextConfig;
