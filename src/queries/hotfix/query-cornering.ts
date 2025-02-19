export const smoothestCornering = [
  {
    $match: {
      ts: {
        $gte: new Date("2025-02-19T00:00:00Z"),
        $lt: new Date("2025-02-27T00:00:00Z"),
      },
      "data.gyroscope.z": { $exists: true, $ne: null },
    },
  },
  {
    $sort: { ts: 1 },
  },
  {
    $group: {
      _id: "$meta.pubKey",
      gyroData: { $push: { ts: "$ts", z: "$data.gyroscope.z" } },
    },
  },
  {
    $project: {
      intervals: {
        $map: {
          input: { $range: [0, { $size: "$gyroData" }, 5] },
          as: "startIdx",
          in: {
            angles: { $slice: ["$gyroData.z", "$$startIdx", 25] },
          },
        },
      },
    },
  },
  {
    $unwind: "$intervals",
  },
  {
    $project: {
      avgAngle: { $avg: "$intervals.angles" },
      varianceAngle: {
        $let: {
          vars: { mean: { $avg: "$intervals.angles" } },
          in: {
            $avg: {
              $map: {
                input: "$intervals.angles",
                as: "angle",
                in: {
                  $pow: [{ $subtract: ["$$angle", "$$mean"] }, 2],
                },
              },
            },
          },
        },
      },
      differenceAngle: {
        $let: {
          vars: { arr: "$intervals.angles" },
          in: {
            $sum: {
              $map: {
                input: {
                  $range: [0, { $subtract: [{ $size: "$$arr" }, 1] }],
                },
                as: "i",
                in: {
                  $abs: {
                    $subtract: [
                      { $arrayElemAt: ["$$arr", "$$i"] },
                      { $arrayElemAt: ["$$arr", { $add: ["$$i", 1] }] },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    $group: {
      _id: "$_id",
      avgDifference: { $avg: "$differenceAngle" },
      avgVariance: { $avg: "$varianceAngle" },
    },
  },
  {
    $match: {
      $and: [{ avgDifference: { $gt: 0 } }, { avgVariance: { $gt: 0 } }],
      avgDifference: { $gte: 0.01, $lte: 1000 },
      avgVariance: { $gte: 0.01, $lte: 1000 },
    },
  },
  {
    $sort: { avgDifference: 1, avgVariance: 1 },
  },
  {
    $limit: 10,
  },
];
