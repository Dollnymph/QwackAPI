const { getNetworth, getPrices } = require("skyhelper-networth");
const { isUuid } = require("../../utils/uuid");
const { makeRequest, wrap } = require("../../utils/request");

let prices = {};
getPrices().then((data) => {
  prices = data;
});
setInterval(async () => {
  prices = await getPrices();
}, 1000 * 60 * 5); // 5 minutes

module.exports = wrap(async function (req, res) {
  const profileId = req.params.profileid.toLowerCase();
  let uuid = req.params.uuid;

  if (!isUuid(uuid)) {
    const mojang_response = await makeRequest(res, `https://api.ashcon.app/mojang/v2/uuid/${uuid}`);
    if (mojang_response?.data) {
      uuid = mojang_response.data.replace(/-/g, "");
    }
  }

  const profileRes = (await makeRequest(res, `https://api.hypixel.net/skyblock/profiles?key=${process.env.HYPIXEL_API_KEY}&uuid=${uuid}`)).data;
  
  // DEBUG: Print what we are looking for
  console.log(`[DEBUG] Searching for profile: "${profileId}"`);
  
  let targetProfile;

  // Logic: Pick profile by name OR pick most recently played if 'best' is requested
  if (profileId === "best") {
    targetProfile = profileRes.profiles.reduce((prev, current) => 
      (prev.last_save || 0) > (current.last_save || 0) ? prev : current
    );
    console.log(`[DEBUG] 'best' requested. Auto-selected: "${targetProfile.cute_name}"`);
  } else {
    targetProfile = profileRes.profiles.find(p => p.cute_name.toLowerCase() === profileId);
    if (!targetProfile) {
        // DEBUG: Print all available names so we can see why it didn't match
        const available = profileRes.profiles.map(p => p.cute_name);
        console.log(`[DEBUG] No match found. Available profiles: ${available.join(", ")}`);
    }
  }

  let response;
  if (targetProfile) {
    response = {
      uuid: uuid,
      name: targetProfile.cute_name,
      id: targetProfile.profile_id,
      last_save: targetProfile.last_save,
      first_join: targetProfile.first_join,
      gamemode: targetProfile?.game_mode || "normal",
      purse: targetProfile.coin_purse || 0,
      bank: targetProfile.banking?.balance || 0,
      networth: await getNetworth(targetProfile.members[uuid], targetProfile.banking?.balance, { prices }),
    };
  }

  return response?.networth 
    ? res.status(200).json({ status: 200, data: response }) 
    : res.status(404).json({ status: 404, message: "Profile not found", debug: "Check API logs for details" });
});