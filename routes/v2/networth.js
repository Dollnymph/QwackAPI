const { getNetworth, getPrices } = require("skyhelper-networth");
const { isUuid } = require("../../utils/uuid");
const { makeRequest, wrap } = require("../../utils/request");

let prices = {};
getPrices().then((data) => { prices = data; });
setInterval(async () => { prices = await getPrices(); }, 1000 * 60 * 5);

module.exports = wrap(async function (req, res) {
  const profileId = req.params.profileid?.toLowerCase();
  let uuid = req.params.uuid;
  let response = null; // Initialize as null

  if (!isUuid(uuid)) {
    const mojang_response = await makeRequest(res, `https://api.ashcon.app/mojang/v2/uuid/${uuid}`);
    if (mojang_response?.data) uuid = mojang_response.data.replace(/-/g, "");
  }

  const profileRes = (await makeRequest(res, `https://api.hypixel.net/skyblock/profiles?key=${process.env.HYPIXEL_API_KEY}&uuid=${uuid}`)).data;
  
  if (profileRes?.profiles) {
    // 1. Try to find the specific profile name
    let data = profileRes.profiles.find(p => p.cute_name.toLowerCase() === profileId);
    
    // 2. Fallback: If "best" or name not found, pick the most recently active profile
    if (!data || profileId === "best") {
      data = profileRes.profiles.reduce((prev, current) => 
        (prev.last_save || 0) > (current.last_save || 0) ? prev : current
      );
    }

    // Build the response
    response = {
      uuid: uuid,
      name: data.cute_name,
      id: data.profile_id,
      networth: await getNetworth(data.members[uuid], data.banking?.balance, { prices }),
    };
  }

  return response ? res.status(200).json({ status: 200, data: response }) : res.status(404).json({ status: 404, message: "Profile not found" });
});