const express = require("express");
const router = express.Router();
const { getInterviewHistory, clearInterviewHistory } = require("../services/interview.service");

router.get("/interviews", async (req, res) => {
  try {
    const interviews = await getInterviewHistory();

    return res.json({
      success: true,
      interviews,
    });
  } catch (error) {
    console.error("Fetch interview history error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch interview history.",
    });
  }
});

router.delete("/interviews", async (req, res) => {
  try {
    const confirmation = req.headers["x-confirm-clear"];

    if (confirmation !== "clear-all") {
      return res.status(400).json({
        success: false,
        error: "Missing explicit confirmation. Send header X-Confirm-Clear: clear-all to wipe interview history.",
        code: "CONFIRMATION_REQUIRED",
      });
    }

    await clearInterviewHistory();

    return res.json({
      success: true,
      message: "Interview history cleared successfully.",
    });
  } catch (error) {
    console.error("Clear interview history error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to clear interview history.",
    });
  }
});

module.exports = router;
