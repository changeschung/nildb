export const mostEcoFriendlyQuery = [
  {
    $match: {
      ts: {
        $gte: new Date("2025-03-11T00:00:00.000Z"),
        $lte: new Date("2025-03-18T23:59:59.999Z"),
      },
      "data.vehicle_info": { $exists: true },
      $or: [
        {
          $and: [
            { "data.vehicle_info.maf": { $gte: 10, $lte: 15 } },
            { "data.vehicle_info.iat": { $gte: 20, $lte: 40 } },
            { "data.vehicle_info.fuel_rate": { $exists: true } },
          ],
        },
        { "data.vehicle_info.power_consumption": { $exists: true } },
      ],
    },
  },
  {
    $addFields: {
      vehicleType: {
        $cond: [
          {
            $gt: [{ $ifNull: ["$data.vehicle_info.power_consumption", 0] }, 0],
          },
          "electric",
          "gas",
        ],
      },
      consumptionMetric: {
        $cond: [
          {
            $gt: [{ $ifNull: ["$data.vehicle_info.power_consumption", 0] }, 0],
          },
          "$data.vehicle_info.power_consumption",
          "$data.vehicle_info.fuel_rate",
        ],
      },
    },
  },
  {
    $group: {
      _id: "$meta.pubKey",
      driver: { $first: "$meta.pubKey" },
      country: { $first: "$data.location.country_code" },
      vehicleType: { $first: "$vehicleType" },
      avgConsumption: { $avg: "$consumptionMetric" },
      recordCount: { $sum: 1 },
      mafInRange: {
        $sum: {
          $cond: [
            {
              $and: [
                { $gte: ["$data.vehicle_info.maf", 10] },
                { $lte: ["$data.vehicle_info.maf", 15] },
              ],
            },
            1,
            0,
          ],
        },
      },
      iatInRange: {
        $sum: {
          $cond: [
            {
              $and: [
                { $gte: ["$data.vehicle_info.iat", 20] },
                { $lte: ["$data.vehicle_info.iat", 40] },
              ],
            },
            1,
            0,
          ],
        },
      },
    },
  },
  {
    $addFields: {
      mafCompliancePercentage: {
        $multiply: [{ $divide: ["$mafInRange", "$recordCount"] }, 100],
      },
      iatCompliancePercentage: {
        $multiply: [{ $divide: ["$iatInRange", "$recordCount"] }, 100],
      },
    },
  },
  {
    $match: {
      recordCount: { $gte: 10 },
      $or: [
        { vehicleType: "electric" },
        {
          $and: [
            { vehicleType: "gas" },
            { mafCompliancePercentage: { $gte: 60 } },
            { iatCompliancePercentage: { $gte: 60 } },
          ],
        },
      ],
    },
  },
  {
    $project: {
      _id: 1,
      driver: 1,
      country: 1,
      vehicleType: 1,
      avgConsumption: 1,
      recordCount: 1,
      mafCompliancePercentage: 1,
      iatCompliancePercentage: 1,
      weightedConsumption: {
        $cond: [
          { $eq: ["$vehicleType", "electric"] },
          { $multiply: ["$avgConsumption", 0.2] },
          "$avgConsumption",
        ],
      },
    },
  },
  {
    $addFields: {
      ecoScore: {
        $cond: [
          { $eq: ["$vehicleType", "gas"] },
          {
            $multiply: [
              "$weightedConsumption",
              {
                $divide: [
                  {
                    $add: [
                      "$mafCompliancePercentage",
                      "$iatCompliancePercentage",
                    ],
                  },
                  200,
                ],
              },
            ],
          },
          "$weightedConsumption",
        ],
      },
    },
  },
  {
    $match: {
      ecoScore: { $gt: 0 },
    },
  },
  {
    $sort: { ecoScore: 1 },
  },
  {
    $limit: 10,
  },
];
