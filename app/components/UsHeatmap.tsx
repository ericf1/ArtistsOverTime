"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { FeatureCollection } from "geojson";
import generate_synthetic_data from "../utils/synth";

interface ArtistData {
  name: string;
  color: string;
  colorScale: d3.ScaleSequential<string>;
}

export default function UsHeatmap() {
  const NUMBER_OF_MONTHS = 12; // Adjust for how many months you want to show
  const ref = useRef<SVGSVGElement>(null);

  // calculate the starting month based NUMBER_OF_MONTHS
  const now = new Date();
  const startMonth = new Date(
    now.getFullYear(),
    now.getMonth() - NUMBER_OF_MONTHS + 1,
    1
  );
  const startMonthStr = `${startMonth.getFullYear()}-${String(
    startMonth.getMonth() + 1
  ).padStart(2, "0")}`;
  const [currentMonth, setCurrentMonth] = useState(startMonthStr);
  const [currentArtist, setCurrentArtist] = useState("taylor-swift");
  const [isPlaying, setIsPlaying] = useState(false);
  const [monthlyData, setMonthlyData] = useState<
    Record<string, Record<string, Record<string, number>>>
  >({});

  // Artists configuration
  const artists: Record<string, ArtistData> = {
    "taylor-swift": {
      name: "Taylor Swift",
      color: "#8B5CF6", // Purple
      colorScale: d3
        .scaleSequential()
        .domain([20, 100])
        .interpolator(d3.interpolateRgb("#f3f4f6", "#8B5CF6")),
    },
    // "sabrina-carpenter": {
    //   name: "Sabrina Carpenter",
    //   color: "#EF4444", // Red
    //   colorScale: d3
    //     .scaleSequential()
    //     .domain([20, 100])
    //     .interpolator(d3.interpolateRgb("#f3f4f6", "#EF4444")),
    // },
    "zach-bryan": {
      name: "Zach Bryan",
      color: "#10B981", // Green
      colorScale: d3
        .scaleSequential()
        .domain([20, 100])
        .interpolator(d3.interpolateRgb("#f3f4f6", "#10B981")),
    },
  };

  // Generate monthly timeline (last 24 months)

  const generateMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = NUMBER_OF_MONTHS - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      months.push(monthStr);
    }
    return months;
  };

  const availableMonths = generateMonths();

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    const width = 1000;
    const height = 350;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    async function loadMonthlyData(): Promise<
      Record<string, Record<string, Record<string, number>>>
    > {
      let allData: Record<string, Record<string, Record<string, number>>> = {};

      // Initialize data structure
      Object.keys(artists).forEach((artistKey) => {
        allData[artistKey] = {};
        availableMonths.forEach((month) => {
          allData[artistKey][month] = {};
        });
      });

      // Try to load real data, fall back to synthetic data
      for (const artistKey of Object.keys(artists)) {
        for (const month of availableMonths) {
          const csvFile = `/data/${artistKey}/${month}.csv`;

          try {
            const rows = await d3.csv(csvFile, (d: { [x: string]: any }) => ({
              name: (d["DMA"] ?? "")
                .trim()
                .toLowerCase()
                .replace(/[,-]/g, " ")
                .replace(/\s+/g, " ")
                .trim(),
              score: +(d[artists[artistKey].name] ?? 0),
            }));

            rows.forEach((d) => {
              if (d.name && !isNaN(d.score)) {
                allData[artistKey][month][d.name] = d.score;
              }
            });
          } catch (error) {
            // Generate synthetic data
            allData = generate_synthetic_data(
              artistKey,
              month,
              availableMonths,
              allData
            );
          }
        }
      }

      return allData;
    }

    async function drawMap() {
      const geo = await d3.json<FeatureCollection>("/nielsen-mkt-map.json");

      if (!geo?.features) {
        console.error("Invalid GeoJSON format");
        return;
      }

      const allData = await loadMonthlyData();
      setMonthlyData(allData);

      // Clear any existing content
      svg.selectAll("*").remove();

      const projection = d3.geoMercator().fitSize([width, height], geo);
      const path = d3.geoPath().projection(projection);

      // Main map group
      const mapGroup = svg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g");

      // Draw DMA regions
      const paths = mapGroup
        .selectAll("path")
        .data(geo.features)
        .join("path")
        .attr("d", path)
        .attr("transform", (d) => {
          const allTransforms = "translate(20, 0) scale(1.1)"; // default transform

          const dmaName =
            (d.properties as { dma_name?: string })?.dma_name ?? "";
          if (
            dmaName.includes("Alaska") ||
            dmaName.includes("Anchorage") ||
            dmaName.includes("Fairbanks") ||
            dmaName.includes("Juneau")
          ) {
            return `scale(0.8) translate(200, 75)`;
          }
          return allTransforms;
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5);

      // Function to update colors
      function updateMapColors(artist: string, month: string) {
        const artistData = allData[artist] || {};
        const monthData = artistData[month] || {};
        const colorScale = artists[artist].colorScale;

        paths
          .transition()
          .duration(600)
          .ease(d3.easeQuadInOut)
          .attr("fill", (d) => {
            const rawName =
              (d.properties as { dma_name?: string })?.dma_name ?? "";
            const regionKey = rawName
              .trim()
              .toLowerCase()
              .replace(/[,-]/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            const score = monthData[regionKey];
            return score ? colorScale(score) : "#f5f5f5";
          });

        // Update tooltips
        paths.select("title").remove();
        paths.append("title").text((d) => {
          const rawName =
            (d.properties as { dma_name?: string })?.dma_name ?? "";
          const regionKey = rawName
            .trim()
            .toLowerCase()
            .replace(/[,-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          const score = monthData[regionKey];

          if (!score) return `${rawName} (${formatMonth(month)}): No data`;

          const intensity =
            score >= 80
              ? "Very High"
              : score >= 60
              ? "High"
              : score >= 40
              ? "Moderate"
              : score >= 20
              ? "Low"
              : "Very Low";

          return `${rawName}\n${artists[artist].name} - ${formatMonth(
            month
          )}\nSearch Interest: ${score.toFixed(0)}/100 (${intensity})`;
        });
      }

      // Initial rendering
      updateMapColors(currentArtist, currentMonth);

      // Store update function globally
      window.updateMapColors = updateMapColors;

      // Add Legend
      const legendWidth = 200;
      const legendHeight = 5;
      const legendX = width - legendWidth - 700;
      const legendY = height - 100;

      // Legend background
      const legendGroup = mapGroup.append("g").attr("class", "legend-group");

      legendGroup
        .append("rect")
        .attr("x", legendX - 10)
        .attr("y", legendY - 20)
        .attr("width", legendWidth + 20)
        .attr("height", 20)
        .attr("fill", "white");
      // .attr("stroke", "#ccc")
      // .attr("rx", 5);

      // Create gradient (will be updated when artist changes)
      const gradient = svg
        .append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%");

      function updateLegend(artist: string) {
        const colorScale = artists[artist].colorScale;

        // Update gradient
        gradient.selectAll("stop").remove();
        const colorStops = [0, 0.25, 0.5, 0.75, 1];
        colorStops.forEach((stop) => {
          gradient
            .append("stop")
            .attr("offset", `${stop * 100}%`)
            .attr("stop-color", colorScale(20 + (100 - 20) * stop));
        });
      }

      // Legend rectangle
      legendGroup
        .append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

      // Legend labels
      legendGroup
        .append("text")
        .attr("x", legendX)
        .attr("y", legendY - 5)
        .attr("text-anchor", "start")
        .attr("font-size", "8px")
        .attr("font-family", "Arial, sans-serif")
        .text("← LOWER INTEREST");

      legendGroup
        .append("text")
        .attr("x", legendX + legendWidth)
        .attr("y", legendY - 5)
        .attr("text-anchor", "end")
        .attr("font-size", "8px")
        .attr("font-family", "Arial, sans-serif")
        .text("HIGHER INTEREST →");

      // Add month/year display
      const dateDisplay = mapGroup
        .append("text")
        .attr("x", 100)
        .attr("y", 50)
        .attr("font-size", "24px")
        .attr("font-weight", "bold")
        .attr("font-family", "Arial, sans-serif")
        .attr("fill", "#333")
        .text(formatMonth(currentMonth));

      // Add current artist display
      const artistDisplay = mapGroup
        .append("text")
        .attr("x", 100)
        .attr("y", 80)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("font-family", "Arial, sans-serif")
        .attr("fill", artists[currentArtist].color)
        .text(`${artists[currentArtist].name}`);

      // Store update functions
      window.updateLegend = updateLegend;
      window.updateDateDisplay = (month: string) => {
        dateDisplay
          // .transition()
          // .duration(300)
          // .style("opacity", 0)
          // .transition()
          // .duration(300)
          // .style("opacity", 1)
          .text(formatMonth(month));
      };

      window.updateArtistDisplay = (
        artistName: string,
        artistColor: string
      ) => {
        artistDisplay
          // .transition()
          // .duration(300)
          // .style("opacity", 0)
          // .transition()
          // .duration(300)
          // .style("opacity", 1)
          // also do color
          .attr("fill", artistColor)
          .text(artistName);
      };

      // Initial legend setup
      updateLegend(currentArtist);
    }

    drawMap();
  }, []);

  // Update map when artist or month changes
  useEffect(() => {
    if (
      window.updateMapColors &&
      window.updateLegend &&
      window.updateDateDisplay &&
      window.updateArtistDisplay
    ) {
      window.updateMapColors(currentArtist, currentMonth);
      window.updateLegend(currentArtist);
      window.updateDateDisplay(currentMonth);
      window.updateArtistDisplay(
        artists[currentArtist].name,
        artists[currentArtist].color
      );
    }
  }, [currentArtist, currentMonth]);

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentMonth((prev) => {
          const currentIndex = availableMonths.indexOf(prev);
          const nextIndex = (currentIndex + 1) % availableMonths.length;
          return availableMonths[nextIndex];
        });
      }, 1500); // Change month every 1.5 seconds
    }

    return () => clearInterval(interval);
  }, [isPlaying, availableMonths]);

  return (
    <div className="w-full">
      <svg ref={ref} className="w-full h-auto" />

      {/* Controls */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Timeline Control */}
          <div>
            {/* Month Slider */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={availableMonths.length - 1}
                step="1"
                value={availableMonths.indexOf(currentMonth)}
                onChange={(e) =>
                  setCurrentMonth(availableMonths[parseInt(e.target.value)])
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, ${
                    artists[currentArtist].color
                  } 0%, ${artists[currentArtist].color} ${
                    (availableMonths.indexOf(currentMonth) /
                      (availableMonths.length - 1)) *
                    100
                  }%, #e5e7eb ${
                    (availableMonths.indexOf(currentMonth) /
                      (availableMonths.length - 1)) *
                    100
                  }%, #e5e7eb 100%)`,
                }}
              />

              {/* Month markers - show every n months */}
              {/* <div className="flex justify-between mt-2 text-xs text-gray-600">
                {availableMonths
                  .filter((_, i) => i % 2 === 0)
                  .map((month) => (
                    <span
                      key={month}
                      className={`cursor-pointer py-1 rounded ${
                        currentMonth === month
                          ? "font-bold"
                          : "hover:bg-gray-100"
                      }`}
                      style={{
                        color:
                          currentMonth === month
                            ? artists[currentArtist].color
                            : undefined,
                      }}
                      onClick={() => setCurrentMonth(month)}
                    >
                      {formatMonth(month)}
                    </span>
                  ))}
              </div> */}
            </div>
          </div>
          <div className="flex flex-row justify-between items-center mt-4">
            {/* Artist Selection */}
            <div>
              <div className="flex space-x-4">
                {Object.entries(artists).map(([key, artist]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentArtist(key)}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      currentArtist === key
                        ? "text-white shadow-lg transform scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor:
                        currentArtist === key ? artist.color : undefined,
                    }}
                  >
                    {artist.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Play Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white px-6 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: artists[currentArtist].color,
                }}
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentMonth(availableMonths[0]);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                ⏮ Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${artists[currentArtist].color};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${artists[currentArtist].color};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

declare global {
  interface Window {
    updateMapColors: (artist: string, month: string) => void;
    updateLegend: (artist: string) => void;
    updateDateDisplay: (month: string) => void;
    updateArtistDisplay: (artistName: string, artistColor: string) => void;
  }
}
