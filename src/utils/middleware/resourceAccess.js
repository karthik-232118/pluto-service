const express = require("express");
const path = require("path");

const mediaAccess = (req, res, next) => {
  try {
    const { type } = req.params;

    // Map type to relative paths and their respective base directory
    const typeToPathMap = {
      d: "media/Document",
      p: "media/Document/temp_preview",
      trs: "media/TrainingSimulation",
      ts: "media/TestSimulation",
      e: "eSign",
      si: "media/SopImage",
      bd: "media/bulk/Document",
      sfd: "media/SopFlowDocument",
      r: "media/Risk",
      tb: "media/Template/Blank",
      td: "media/Template/TemplateDocument",
    };

    // Get the relative path from the map
    const relativePath = typeToPathMap[type];

    if (relativePath) {
      // Construct the full path
      const baseDirectory = "src/infrastructure";
      const directoryPath = path.posix.join(baseDirectory, relativePath);

      // Serve static files from the constructed path
      express.static(directoryPath)(req, res, next);
    } else {
      // Handle invalid type
      return res.status(404).json({ message: "Invalid URL type" });
    }
  } catch (error) {
    console.error("Error in mediaAccess middleware:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  mediaAccess,
};
