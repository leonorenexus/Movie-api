const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

async function getMovies(page = 1) {
  const { data } = await axios.get(
    "https://archive.org/advancedsearch.php",
    {
      params: {
        q: "mediatype:(movies)",
        fl: "identifier,title,year",
        rows: 100,
        page,
        output: "json"
      }
    }
  );

  return (data.response.docs || []).map(movie => ({
    id: movie.identifier,
    title: movie.title || "Untitled",
    year: movie.year || null,
    poster: `https://archive.org/services/img/${movie.identifier}`
  }));
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    endpoints: [
      "/api/movies",
      "/api/movie/:id"
    ]
  });
});

app.get("/api/movies", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);

    const movies = await getMovies(page);

    res.json({
      success: true,
      page,
      count: movies.length,
      movies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/api/movie/:id", async (req, res) => {
  try {
    const identifier = req.params.id;

    const { data } = await axios.get(
      `https://archive.org/metadata/${identifier}`
    );

    const files = data.files || [];

    const streams = files
      .filter(file => {
        const name = (file.name || "").toLowerCase();

        return (
          name.endsWith(".mp4") ||
          name.endsWith(".m4v") ||
          name.endsWith(".ogv")
        );
      })
      .map(file => ({
        name: file.name,
        url: `https://archive.org/download/${identifier}/${encodeURIComponent(file.name)}`
      }));

    res.json({
      success: true,
      id: identifier,
      title: data.metadata?.title || "",
      description: data.metadata?.description || "",
      poster: `https://archive.org/services/img/${identifier}`,
      streams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
