const axios = require("axios");
const pool = require("../db");
const format = require("pg-format"); // Import the formatter

module.exports = async function refreshAuctions() {
  async function updateAuctions() {
    try {
      const response = await axios.get("https://api.hypixel.net/skyblock/auctions");
      if (response.status !== 200) return;

      await pool.query('TRUNCATE TABLE auctions');

      for (let i = 0; i < response.data.totalPages; i++) {
        const pageData = await axios.get(`https://api.hypixel.net/skyblock/auctions?page=${i}`);
        const auctions = pageData.data.auctions;

        // Convert the array of objects into a 2D array for pg-format
        const values = auctions.map(a => [a.uuid, a.item_name, a.starting_bid, a.bin || false, a.auctioneer]);

        // Insert the whole page in one single query
        const sql = format('INSERT INTO auctions (uuid, item_name, starting_bid, bin, auctioneer) VALUES %L ON CONFLICT DO NOTHING', values);
        await pool.query(sql);
        
        console.log(`[AUCTIONS] Page ${i} inserted.`);
      }
      console.log("[AUCTIONS] Updated successfully");
    } catch (err) {
      console.error("Failed to update: ", err);
    }
  }

  updateAuctions();
  setInterval(updateAuctions, 1000 * 60 * 10);
};
