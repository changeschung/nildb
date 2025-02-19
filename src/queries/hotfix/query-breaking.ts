// 22892020-6b84-43ac-a79f-6ad84182124c 'Best Breaking Efficiency'
export const breakingEfficiency = [
  {
    $match: {
      ts: {
        $gte: new Date("2025-02-12T00:00:00Z"),
        $lt: new Date("2025-02-21T00:00:00Z"),
      },
      "data.accelerometer.z": { $exists: true, $ne: null },
    },
  },
  {
    $group: {
      _id: "$meta.pubKey",
      allZ: { $push: { ts: "$ts", z: "$data.accelerometer.z" } },
      count: { $sum: 1 },
    },
  },
  {
    $match: {
      count: { $gte: 100 },
    },
  },
  {
    $project: {
      avgZ: { $avg: "$allZ.z" },
      variance: {
        $let: {
          vars: { mean: { $avg: "$allZ.z" } },
          in: {
            $avg: {
              $map: {
                input: "$allZ.z",
                as: "acc",
                in: {
                  $pow: [{ $subtract: ["$$acc", "$$mean"] }, 2],
                },
              },
            },
          },
        },
      },
    },
  },
  {
    $sort: { avgZ: 1, variance: 1 },
  },
  {
    $limit: 10,
  },
];
