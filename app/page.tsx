import Footer from "./components/Footer";
import UsHeatmap from "./components/UsHeatmap";

export default function Home() {
  return (
    <main>
      <div className="p-4">
        <div className="flex flex-col items-center justify-center gap-4 text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold">
            Artist Metro Heatmap
          </h1>
          <p className="text-sm sm:text-base">
            Visualizing the popularity of popular artists across the US. Data
            from Google Trends.
          </p>
        </div>

        <UsHeatmap />
      </div>
      <Footer />
    </main>
  );
}
