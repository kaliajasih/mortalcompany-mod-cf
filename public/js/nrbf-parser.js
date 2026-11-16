/**
 * NRBF Parser & Serializer for Mortal Company Mobile (MS-NRBF / .NET Binary Remoting Format)
 * Pure client-side zero-dependency library.
 */

class NrbfSaveManager {
  static parse(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength < 200) {
      throw new Error("File too small to be a valid Mortal Company save.");
    }
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      throw new Error("File exceeds maximum allowed size (10 MB).");
    }

    const view = new DataView(arrayBuffer);
    const u8 = new Uint8Array(arrayBuffer);

    // Verify MS-NRBF header
    if (u8[0] !== 0x00 || u8[1] !== 0x01 || u8[2] !== 0x00 || u8[3] !== 0x00) {
      throw new Error("Invalid MS-NRBF binary header. Please ensure you upload the unmodified save file.");
    }

    // Search for GameData header pattern
    let p = 0;
    let foundGameData = false;
    for (let i = 0; i < Math.min(u8.length - 20, 300); i++) {
      if (u8[i] === 0x47 && u8[i+1] === 0x61 && u8[i+2] === 0x6D && u8[i+3] === 0x65 && 
          u8[i+4] === 0x44 && u8[i+5] === 0x61 && u8[i+6] === 0x74 && u8[i+7] === 0x61) {
        foundGameData = true;
        break;
      }
    }

    if (!foundGameData) {
      throw new Error("GameData record not found in save file.");
    }

    // Search for the end of header and start of integer fields
    // Structure: ... [0x01, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00] followed by 5 x Int32 values:
    // collectedQuota, targetQuota, remainingDays, targetPlanet, shopMoney
    let offset = -1;
    for (let i = 100; i < Math.min(u8.length - 40, 500); i++) {
      if (u8[i] === 0x01 && u8[i+1] === 0x01 && u8[i+2] === 0x08 && u8[i+3] === 0x02 &&
          u8[i+4] === 0x00 && u8[i+5] === 0x00 && u8[i+6] === 0x00) {
        offset = i + 7;
        break;
      }
    }

    if (offset === -1) {
      // Fallback relative position
      offset = 217;
    }

    const collectedQuota = view.getInt32(offset, true); offset += 4;
    const targetQuota = view.getInt32(offset, true); offset += 4;
    const remainingDays = view.getInt32(offset, true); offset += 4;
    const targetPlanet = view.getInt32(offset, true); offset += 4;
    const shopMoney = view.getInt32(offset, true); offset += 4;

    // Read SaveDate string
    // Format: 0x06 (String), 4-byte ObjectId, 1-byte length, then chars
    let saveDate = "15.11.2026 14:49";
    if (u8[offset] === 0x06) {
      offset += 1 + 4;
      const strLen = u8[offset++];
      let str = "";
      for (let s = 0; s < strLen; s++) str += String.fromCharCode(u8[offset++]);
      saveDate = str;
    }

    // Skip MemberReferences to objects
    // Look for Object 4: ItemsPositions (RecordType 0x07 BinaryArray)
    let posOffset = -1;
    let itemCount = 0;
    for (let i = offset; i < u8.length - 20; i++) {
      if (u8[i] === 0x07 && u8[i+1] === 0x04 && u8[i+2] === 0x00 && u8[i+3] === 0x00 && u8[i+4] === 0x00) {
        // BinaryArrayTypeEnum (1 byte at i+5)
        // Rank (4 bytes at i+6)
        // Length 1 = count (4 bytes at i+10)
        // Length 2 = dims (4 bytes at i+14)
        const rank = view.getInt32(i + 6, true);
        const count = view.getInt32(i + 10, true);
        const dims = view.getInt32(i + 14, true);
        if (dims === 3 && count > 0 && count < 2000) {
          posOffset = i + 20; // 0x07 (1) + ObjId (4) + TypeEnum (1) + Rank (4) + Len1 (4) + Len2 (4) + PrimType (2)
          itemCount = count;
          break;
        }
      }
    }

    const items = [];
    if (posOffset !== -1 && itemCount > 0) {
      let curP = posOffset;
      const positions = [];
      for (let j = 0; j < itemCount; j++) {
        if (curP + 12 > view.byteLength) break;
        const x = view.getFloat32(curP, true); curP += 4;
        const y = view.getFloat32(curP, true); curP += 4;
        const z = view.getFloat32(curP, true); curP += 4;
        positions.push({ x, y, z });
      }

      // Next is Object 5: ItemsRotations
      const rotations = [];
      let rotFound = false;
      for (let i = curP; i < Math.min(curP + 300, u8.length - 10); i++) {
        if (u8[i] === 0x07 && u8[i+1] === 0x05 && u8[i+2] === 0x00 && u8[i+3] === 0x00 && u8[i+4] === 0x00) {
          curP = i + 20;
          rotFound = true;
          break;
        }
      }

      if (rotFound) {
        for (let j = 0; j < itemCount; j++) {
          if (curP + 12 > view.byteLength) break;
          const rx = view.getFloat32(curP, true); curP += 4;
          const ry = view.getFloat32(curP, true); curP += 4;
          const rz = view.getFloat32(curP, true); curP += 4;
          rotations.push({ rx, ry, rz });
        }
      }

      // Next is Object 6: ItemsNames (ArrayOfObjectWithMap / ArraySingleString)
      const names = [];
      let nameFound = false;
      for (let i = curP; i < Math.min(curP + 300, u8.length - 10); i++) {
        if (u8[i] === 0x11 && u8[i+1] === 0x06 && u8[i+2] === 0x00 && u8[i+3] === 0x00 && u8[i+4] === 0x00) {
          curP = i + 9;
          nameFound = true;
          break;
        }
      }

      if (nameFound) {
        for (let j = 0; j < itemCount; j++) {
          if (curP >= u8.length) break;
          if (u8[curP] === 0x06) {
            curP += 5; // skip 0x06 and 4-byte ID
            if (curP >= u8.length) break;
            const nlen = u8[curP++];
            let nstr = "";
            for (let c = 0; c < nlen && curP < u8.length; c++) nstr += String.fromCharCode(u8[curP++]);
            names.push(nstr.replace(/[^a-zA-Z0-9 _-]/g, '').trim());
          } else {
            names.push("ITEM");
          }
        }
      }

      for (let k = 0; k < itemCount; k++) {
        const p = positions[k] || { x: 31.0, y: 22.38, z: 30.5 };
        const r = rotations[k] || { rx: 0, ry: 0, rz: 0 };
        const n = names[k] || "SCRAP";
        items.push({
          id: k,
          name: n,
          x: p.x,
          y: p.y,
          z: p.z,
          rx: r.rx,
          ry: r.ry,
          rz: r.rz
        });
      }
    }

    // Detect unlocked upgrades in save
    let hasTeleporter = false;
    let hasInverse = false;
    for (let i = 0; i < u8.length - 15; i++) {
      if (u8[i] === 0x49 && u8[i+1] === 0x4E && u8[i+2] === 0x56 && u8[i+3] === 0x45) hasInverse = true; // INVE
      if (u8[i] === 0x54 && u8[i+1] === 0x45 && u8[i+2] === 0x4C && u8[i+3] === 0x45 && u8[i+4] === 0x50) hasTeleporter = true; // TELEP
    }

    return {
      shopMoney: isNaN(shopMoney) ? 190 : shopMoney,
      collectedQuota: isNaN(collectedQuota) ? 0 : collectedQuota,
      targetQuota: isNaN(targetQuota) ? 247 : targetQuota,
      remainingDays: isNaN(remainingDays) ? 2 : remainingDays,
      targetPlanet: isNaN(targetPlanet) ? 6 : targetPlanet,
      hasTeleporter: hasTeleporter,
      hasInverse: hasInverse,
      saveDate: saveDate,
      items: items
    };
  }

  static serialize(saveData, options = {}) {
    const items = saveData.items || [];
    const count = items.length;
    const hasTeleporter = !!options.hasTeleporter;
    const hasInverse = !!options.hasInverse;

    const buffer = new ArrayBuffer(10000 + count * 60);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    let p = 0;

    const headerBytes = [
      0x00, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
      0x00, 0x0C, 0x02, 0x00, 0x00, 0x00, 0x46, 0x41, 0x73, 0x73, 0x65, 0x6D, 0x62, 0x6C, 0x79, 0x2D, 
      0x43, 0x53, 0x68, 0x61, 0x72, 0x70, 0x2C, 0x20, 0x56, 0x65, 0x72, 0x73, 0x69, 0x6F, 0x6E, 0x3D, 
      0x30, 0x2E, 0x30, 0x2E, 0x30, 0x2E, 0x30, 0x2C, 0x20, 0x43, 0x75, 0x6C, 0x74, 0x75, 0x72, 0x65, 
      0x3D, 0x6E, 0x65, 0x75, 0x74, 0x72, 0x61, 0x6C, 0x2C, 0x20, 0x50, 0x75, 0x62, 0x6C, 0x69, 0x63, 
      0x4B, 0x65, 0x79, 0x54, 0x6F, 0x6B, 0x65, 0x6E, 0x3D, 0x6E, 0x75, 0x6C, 0x6C, 0x05, 0x01, 0x00, 
      0x00, 0x00, 0x08, 0x47, 0x61, 0x6D, 0x65, 0x44, 0x61, 0x74, 0x61, 0x0E, 0x00, 0x00, 0x00, 0x0E, 
      0x43, 0x6F, 0x6C, 0x6C, 0x65, 0x63, 0x74, 0x65, 0x64, 0x51, 0x75, 0x6F, 0x74, 0x61, 0x0B, 0x54, 
      0x61, 0x72, 0x67, 0x65, 0x74, 0x51, 0x75, 0x6F, 0x74, 0x61, 0x0D, 0x52, 0x65, 0x6D, 0x61, 0x69, 
      0x6E, 0x69, 0x6E, 0x67, 0x44, 0x61, 0x79, 0x73, 0x0C, 0x54, 0x61, 0x72, 0x67, 0x65, 0x74, 0x50, 
      0x6C, 0x61, 0x6E, 0x65, 0x74, 0x09, 0x53, 0x68, 0x6F, 0x70, 0x4D, 0x6F, 0x6E, 0x65, 0x79, 0x08, 
      0x53, 0x61, 0x76, 0x65, 0x44, 0x61, 0x74, 0x65, 0x0E, 0x49, 0x74, 0x65, 0x6D, 0x73, 0x50, 0x6F, 
      0x73, 0x69, 0x74, 0x69, 0x6F, 0x6E, 0x73, 0x0E, 0x49, 0x74, 0x65, 0x6D, 0x73, 0x52, 0x6F, 0x74, 
      0x61, 0x74, 0x69, 0x6F, 0x6E, 0x73, 0x0A, 0x49, 0x74, 0x65, 0x6D, 0x73, 0x4E, 0x61, 0x6D, 0x65, 
      0x73, 0x13, 0x4C, 0x61, 0x73, 0x74, 0x43, 0x6F, 0x6E, 0x73, 0x75, 0x6D, 0x61, 0x62, 0x6C, 0x65, 
      0x4F, 0x72, 0x64, 0x65, 0x72, 0x17, 0x4E, 0x6F, 0x6E, 0x43, 0x6F, 0x6E, 0x73, 0x75, 0x6D, 0x61, 
      0x62, 0x6C, 0x65, 0x49, 0x74, 0x65, 0x6D, 0x73, 0x4E, 0x61, 0x6D, 0x65, 0x73, 0x1B, 0x4E, 0x6F, 
      0x6E, 0x43, 0x6F, 0x6E, 0x73, 0x75, 0x6D, 0x61, 0x62, 0x6C, 0x65, 0x49, 0x74, 0x65, 0x6D, 0x73, 
      0x48, 0x69, 0x64, 0x65, 0x56, 0x61, 0x6C, 0x75, 0x65, 0x10, 0x53, 0x79, 0x6E, 0x63, 0x45, 0x76, 
      0x65, 0x6E, 0x74, 0x73, 0x53, 0x74, 0x61, 0x74, 0x65, 0x73, 0x17, 0x42, 0x6F, 0x64, 0x79, 0x73, 
      0x53, 0x6F, 0x6C, 0x64, 0x49, 0x64, 0x73, 0x49, 0x6E, 0x54, 0x68, 0x69, 0x73, 0x51, 0x75, 0x6F, 
      0x74, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x03, 0x03, 0x06, 0x06, 0x06, 0x07, 0x07, 0x07, 
      0x08, 0x08, 0x08, 0x08, 0x08, 0x10, 0x53, 0x79, 0x73, 0x74, 0x65, 0x6D, 0x2E, 0x53, 0x69, 0x6E, 
      0x67, 0x6C, 0x65, 0x5B, 0x2C, 0x5D, 0x10, 0x53, 0x79, 0x73, 0x74, 0x65, 0x6D, 0x2E, 0x53, 0x69, 
      0x6E, 0x67, 0x6C, 0x65, 0x5B, 0x2C, 0x5D, 0x01, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00
    ];
    u8.set(headerBytes, p);
    p += headerBytes.length;

    view.setInt32(p, saveData.collectedQuota || 0, true); p += 4;
    view.setInt32(p, saveData.targetQuota || 247, true); p += 4;
    view.setInt32(p, saveData.remainingDays !== undefined ? saveData.remainingDays : 2, true); p += 4;
    view.setInt32(p, saveData.targetPlanet || 6, true); p += 4;
    view.setInt32(p, saveData.shopMoney || 0, true); p += 4;

    u8[p++] = 0x06;
    view.setUint32(p, 3, true); p += 4;
    const dateStr = saveData.saveDate || "15.11.2026  14.49";
    u8[p++] = dateStr.length;
    for (let i = 0; i < dateStr.length; i++) u8[p++] = dateStr.charCodeAt(i);

    for (let id = 4; id <= 10; id++) {
      u8[p++] = 0x09;
      view.setUint32(p, id === 7 ? 7 : id, true); p += 4;
    }
    u8[p++] = 0x09;
    view.setUint32(p, 7, true); p += 4;

    // Object 4: ItemsPositions
    u8[p++] = 0x07;
    view.setUint32(p, 4, true); p += 4;
    u8[p++] = 0x02;
    view.setUint32(p, 2, true); p += 4;
    view.setUint32(p, count, true); p += 4;
    view.setUint32(p, 3, true); p += 4;
    u8[p++] = 0x00;
    u8[p++] = 0x0B;
    for (let it of items) {
      view.setFloat32(p, it.x, true); p += 4;
      view.setFloat32(p, it.y, true); p += 4;
      view.setFloat32(p, it.z, true); p += 4;
    }

    // Object 5: ItemsRotations
    u8[p++] = 0x07;
    view.setUint32(p, 5, true); p += 4;
    u8[p++] = 0x02;
    view.setUint32(p, 2, true); p += 4;
    view.setUint32(p, count, true); p += 4;
    view.setUint32(p, 3, true); p += 4;
    u8[p++] = 0x00;
    u8[p++] = 0x0B;
    for (let it of items) {
      view.setFloat32(p, it.rx || 0, true); p += 4;
      view.setFloat32(p, it.ry || 0, true); p += 4;
      view.setFloat32(p, it.rz || 0, true); p += 4;
    }

    // Object 6: ItemsNames
    u8[p++] = 0x11;
    view.setUint32(p, 6, true); p += 4;
    view.setUint32(p, count, true); p += 4;

    let nextObjId = 11;
    for (let it of items) {
      u8[p++] = 0x06;
      view.setUint32(p, nextObjId++, true); p += 4;
      const n = it.name || "SCRAP";
      u8[p++] = n.length;
      for (let c = 0; c < n.length; c++) u8[p++] = n.charCodeAt(c);
    }

    // Upgrades
    const upgrades = [];
    if (hasTeleporter) upgrades.push("Regular Teleport");
    if (hasInverse) upgrades.push("Inverse Teleport");

    if (upgrades.length === 0) {
      u8[p++] = 0x11;
      view.setUint32(p, 7, true); p += 4;
      view.setUint32(p, 0, true); p += 4;
    } else {
      u8[p++] = 0x11;
      view.setUint32(p, 7, true); p += 4;
      view.setUint32(p, upgrades.length, true); p += 4;
      for (let upg of upgrades) {
        u8[p++] = 0x06;
        view.setUint32(p, nextObjId++, true); p += 4;
        u8[p++] = upg.length;
        for (let c = 0; c < upg.length; c++) u8[p++] = upg.charCodeAt(c);
      }
    }

    u8[p++] = 0x0F;
    view.setUint32(p, 8, true); p += 4;
    view.setUint32(p, upgrades.length, true); p += 4;
    u8[p++] = 0x01;
    for (let i = 0; i < upgrades.length; i++) u8[p++] = 0x00;

    u8[p++] = 0x0F;
    view.setUint32(p, 9, true); p += 4;
    view.setUint32(p, 3, true); p += 4;
    u8[p++] = 0x01;
    u8[p++] = hasTeleporter ? 0x01 : 0x00;
    u8[p++] = hasInverse ? 0x01 : 0x00;
    u8[p++] = 0x01;

    u8[p++] = 0x0F;
    view.setUint32(p, 10, true); p += 4;
    view.setUint32(p, 0, true); p += 4;
    u8[p++] = 0x08;

    u8[p++] = 0x0B;

    return new Blob([buffer.slice(0, p)], { type: 'application/octet-stream' });
  }
}

window.NrbfSaveManager = NrbfSaveManager;
