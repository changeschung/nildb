export const leastIdleTimeQuery = [
  {
    $match: {
      ts: {
        $gte: new Date("2025-03-19T00:00:00.000Z"),
        $lte: new Date("2025-03-26T23:59:59.999Z"),
      },
      "data.vehicle_info.vss": { $exists: true },
      "data.vehicle_info.runtm": { $exists: true, $gt: 0 },
    },
  },
  {
    $addFields: {
      isIdling: { $eq: ["$data.vehicle_info.vss", 0] },
    },
  },
  {
    $group: {
      _id: "$meta.pubKey",
      driver: { $first: "$meta.pubKey" },
      country: { $first: "$data.location.country_code" },
      totalRuntime: { $sum: "$data.vehicle_info.runtm" },
      idlingTime: {
        $sum: { $cond: ["$isIdling", "$data.vehicle_info.runtm", 0] },
      },
      dataPoints: { $sum: 1 },
    },
  },
  {
    $match: {
      totalRuntime: { $gt: 0 },
      dataPoints: { $gte: 10 },
    },
  },
  {
    $project: {
      _id: 1,
      driver: 1,
      country: 1,
      totalRuntime: 1,
      idlingTime: 1,
      idlingPercentage: {
        $multiply: [{ $divide: ["$idlingTime", "$totalRuntime"] }, 100],
      },
      dataPoints: 1,
    },
  },
  {
    $sort: { idlingPercentage: 1 },
  },
  {
    $limit: 10,
  },
];
