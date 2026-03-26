import React from "react";
import PropTypes from "prop-types";

function Footer() {
  try {
    return (
      <footer style={styles.footer}>
        <p>© {new Date().getFullYear()} fdsaf. All rights reserved.</p>
      </footer>
    );
  } catch (error) {
    console.error("Footer rendering error:", error);
    return (
      <footer style={styles.footer}>
        <p>Failed to load footer.</p>
      </footer>
    );
  }
}

Footer.propTypes = {};

const styles = {
  footer: {
    textAlign: "center",
    padding: "15px",
    backgroundColor: "#282c34",
    color: "#fff",
  },
};

export default React.memo(Footer);
