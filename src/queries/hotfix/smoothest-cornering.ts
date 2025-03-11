export const smoothestCorneringFinal = [
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d0301070342000422cc8858b75f6bf5adcd3ee6381dfd20c1ed4b487eb605fb12d19131ef12339c37a970ddc1a394cf40dee8cbee29bb2789bf52e0b2f40cca66616c6b234eaa62",
    avgDifference: 0.07105307134681418,
    avgVariance: 0.0392506337107804,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004b1e117cc38a79bf95cec341f8315db061aec60fa9a9b65d0af854828abb059c34472225ed062ab471c82fc8b69ab1c7ee120b405cb1adef1a5b68983ff8fb909",
    avgDifference: 0.10427557003257329,
    avgVariance: 0.03231643931539314,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004ebdd7c75ddedaa6f6bf42632d748341316f8747686d2798ffb883b8a4343e60eb41d7b33e86a249a18ad5b451e096ae7e19573b858f1c7e80282533adea5ba1c",
    avgDifference: 0.2049035313001605,
    avgVariance: 0.025770803874311396,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d0301070342000451bb00b47bb48b8526e7094bd9e89c0a24872d41998df5694579badcdd29b497419296c4b30b0f599cf41f516888c022117648ab368cec15d9f7ce7628ca2411",
    avgDifference: 0.32152562277580077,
    avgVariance: 0.011800019193178312,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004929335da41ac444694afe07176ed53454f9e1bde3e0b0395b637bfc51a1b207b5c7881301507c555d35e9a7a13d64a56254dcb87387368fff34a66ae2e7eed57",
    avgDifference: 0.3254132283464567,
    avgVariance: 0.01467434263549034,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d030107034200043544d922d4b691316009906078ff74a1e8bad8d46d5271777d6ce5acdd2d840e82728ad6b4fdf3cb4af231aa9c5c6ebe7f642e19b249a968cb539e7026467fa9",
    avgDifference: 0.35895333792154166,
    avgVariance: 0.012309651374014968,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d0301070342000499b8fa6c72ebf6dd9831a0f7a2174b29185693f9c02b33aea02e94f3d5970d839823045aed40f35641e2c5217e40de71f550b39ffa751e5135f2b47e8b1346d7",
    avgDifference: 0.386634534368071,
    avgVariance: 0.010406346421472201,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d030107034200047f5a7219eaa0135686a96bb1e163ee2e1db7ed0c560a10e26467baee3b71d38dc400dae6c6ed35272d5c34f5cad96fab65f901cb951fb761c9060cc596e65f05",
    avgDifference: 0.3876489123269611,
    avgVariance: 0.011066202416036163,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004a1771762f12fc26f881bea23b1b10fed8e11def99a37f8c0bedc57345473cb7b20ddb6cb7fa650f1b4d95208883cab74ac6f62670ea7709a5d3592289bd21b21",
    avgDifference: 0.4314673518742443,
    avgVariance: 0.03181864444068682,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d030107034200040f5eae9e7b6ac2141f20059a8f78970045a4f2b87910574671ee48e53c4d3e53fd139378a782fd79921614e18dc8bf67a89b6f68f470df64519c7d97d71c8174",
    avgDifference: 0.4389157393483709,
    avgVariance: 0.011884901148615606,
  },
];

export const _smoothestCornering = [
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
