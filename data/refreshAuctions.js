const axios = require("axios");
const pool = require("./db"); // The file you created earlier

module.exports = async function refreshAuctions() {
  async function updateAuctions() {
    try {
      const response = await axios.get("https://api.hypixel.net/skyblock/auctions");
      if (response.status !== 200) return;

      console.log("[AUCTIONS] Starting update...");

      // Clear old data
      await pool.query('TRUNCATE TABLE auctions');

      for (let i = 0; i < response.data.totalPages; i++) {
        const pageData = await axios.get(`https://api.hypixel.net/skyblock/auctions?page=${i}`);
        const auctions = pageData.data.auctions;

        // Insert into database in smaller batches
        for (const auction of auctions) {
          await pool.query(
            'INSERT INTO auctions (uuid, item_name, starting_bid, bin, auctioneer) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
            [auction.uuid, auction.item_name, auction.starting_bid, auction.bin || false, auction.auctioneer]
          );
        }
      }
      console.log("[AUCTIONS] Updated successfully to Neon DB");
    } catch (err) {
      console.error("Failed to update auctions: ", err);
    }
  }

  updateAuctions();
  setInterval(updateAuctions, 1000 * 60 * 10);
};