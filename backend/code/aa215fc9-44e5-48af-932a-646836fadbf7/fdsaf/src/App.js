import React from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="app-container" style={styles.container}>
      <Header />
      <main style={styles.mainContent}>
        {/* Main content placeholder */}
        <h1>Welcome to fdsaf</h1>
        <p>This is the starter UI for your full‑stack application.</p>
      </main>
      <Footer />
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    fontFamily: ""Helvetica Neue", Helvetica, Arial, sans-serif",
  },
  mainContent: {
    flex: 1,
    padding: "20px",
    backgroundColor: "#f9f9f9",
  },
};

export default App;
