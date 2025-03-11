export const bestBreakingEfficiencyFinal = [
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004a141a609e14573a2d411ab5174086d6b1981426b7d344ae76fe615c161677e441f48861d8e2dc8ccfcd039bcd10a286909f1aad6b29da19eb952cda94b9c7cf7",
    avgZ: -9.949578417508418,
    variance: 0.015833228924768454,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004076b4c439adbd5919d657faa727b2a0580cff6b9cba23f07402c3186648cd2d4127c067b304855532ea41a79a54ee5cb6beff3616348f1149986d9b2e82f8f13",
    avgZ: -9.80949323083273,
    variance: 0.17661450117593053,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004607d30a6730c08fcbbb5522e71cc21a5d8c8515c27f79326f3677838260a1c777cee59554bd50f3b500b65e133e6d78cec8a5bb9e823003c8486626ed8fd64a0",
    avgZ: -9.758147328244274,
    variance: 0.027720112569197583,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004f81173ee30b1e8072ff42e6c36fe78901879205acf8b9a2d3b7861f9b2d3b25197c1630e7372aa09a19d11556ffe26516980dc0ff873b850ce5fc009413bd29c",
    avgZ: -9.58287835125448,
    variance: 5.642496778828822,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004ce449ac6ec6a69300a4430075b62a01db481b507ffae35ddf01389a7f16a65b760a4836d1c0b18246f9cb9f085b5f43c3c074ee9b8bae526d35fd75771987893",
    avgZ: -9.531686912065439,
    variance: 1.2289987212601987,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d030107034200040670e6916b939fd6bc928e2814904eaa42662fa6ce1c3f44d2db3d61a1bfaee2e2bf8538bca75272b7308c10ccefcc52da37fc134ff9e7e64790d3992d35b47b",
    avgZ: -9.391222107438017,
    variance: 1.2388902673005173,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004bb3c37a5cf75fc5e05ad94a91ff40f39e2161081a17acefec79a507dd2166aae2cf83687448b1b98efe3da5b91cd49f5cbf8cd1ce8349f48d887dca073cef80a",
    avgZ: -9.35823266157545,
    variance: 6.674156948025995,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d0301070342000410e4cb9a436231701f7d173bc3d9bcdd364f2a2d2535084b2ebb335e7d101c96faadf239734593dd243f95a667a0a0fafcab054b6ef74bfa4bef63b7e06274e5",
    avgZ: -9.270308457844184,
    variance: 6.101403454456213,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004f79d50e275922254d2c057c6d634dd16f82bbf1ffcf25752403915b38f34fa77da8a916dda615ca6821464ae0c8d39ddd9a31b740cdb16a3f7d918baae19afb1",
    avgZ: -9.158134225644787,
    variance: 5.7600406221099885,
  },
  {
    _id: "3059301306072a8648ce3d020106082a8648ce3d03010703420004c19b564c67c6c9cad3a1ea1680d259cd8491b1211c586979248b4890518f58047ca69ab17517724c7d94cbf87de4bcff47b4af83c6a8be8076ab31257ccf543e",
    avgZ: -8.835577380952381,
    variance: 12.434687995278422,
  },
];

export const _breakingEfficiency = [
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
