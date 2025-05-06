var lp_sha2lib = SHA256lib();

function SHA256(s, binary)
{
    return lp_sha2lib.sha256(s, binary);
}


function SHA256_crypt(s)
{
    var salt = rand_str(16);
    return lp_sha2lib.crypt_sha256(s, salt, 5000, null);
}

function ab2bin(buf) {
  var chunkSize = 1024;
  var bytes = new Uint8Array(buf);
  var result = '';

  for (var i = 0; i < Math.ceil(buf.byteLength / chunkSize); i++) {
    result += String.fromCharCode.apply(null, bytes.slice(i * chunkSize, chunkSize * (i + 1)));
  }

  return result;
}

function bin2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0; i < str.length; ++i) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Derive key synchronously. May cause slow script warnings in browser. Only use when new web crypto methods are not available or working properly.
 * @param {*} password
 * @param {*} salt
 * @param {*} num_iterations
 * @param {*} num_bytes
 * @param {*} callback
 */
function lp_pbkdf2_sync(password, salt, num_iterations, num_bytes, callback) {
  if (typeof(document) != 'undefined' && document.getElementById('lpplugin') && typeof(document.getElementById('lpplugin').pbkdf2) == 'function') {
    // webos lpplugin binary case
    var retval = document.getElementById('lpplugin').pbkdf2(btoa(password), btoa(salt), num_iterations, num_bytes);
    if (typeof(callback) == 'function') {
      callback(AES.hex2bin(retval), password, num_iterations);
    }
    return retval;
  } else if ((typeof(g_oldpbkdf2) == 'undefined' || g_oldpbkdf2 != 1) && typeof(lpusexpcomencrypt) == 'function' && lpusexpcomencrypt() && typeof(lpxpcomobj.pbkdf2) == 'function') {
    // firefox lpxpcom binary case
    var retval = lpxpcomobj.pbkdf2(btoa(password), btoa(salt), num_iterations, num_bytes);
    if (typeof(callback) == 'function') {
      callback(AES.hex2bin(retval), password, num_iterations);
    }
    return retval;
  } else if ((typeof(g_oldpbkdf2) == 'undefined' || g_oldpbkdf2 != 1) && typeof(lpuseopensslpbkdf2) == 'function' && lpuseopensslpbkdf2() && typeof(lpopensslpbkdf2) == 'function') {
    // fennec openssl binary case
    var retval = lpopensslpbkdf2(password, salt, num_iterations, num_bytes);
    if (typeof(callback) == 'function') {
      callback(AES.hex2bin(retval), password, num_iterations);
    }
    return retval;
  } else if ((typeof(g_oldpbkdf2) == 'undefined' || g_oldpbkdf2 != 1) && typeof(have_binary_function) == 'function' && have_binary_function('pbkdf2') && typeof(callback) == 'function') {
    // chrome nplastpass or native messaging binary case
    return call_binary_function('pbkdf2', btoa(password), btoa(salt), parseInt(num_iterations), num_bytes, function(retval) { callback(AES.hex2bin(retval), password, num_iterations); });
  } else if ((typeof(g_oldpbkdf2) == 'undefined' || g_oldpbkdf2 != 1) && typeof(have_nplastpass) == 'function' && have_nplastpass() && typeof(g_nplastpass) != 'undefined' && typeof(g_nplastpass.pbkdf2) == 'function') {
    // chrome/opera/safari nplastpass binary case
    var retval = g_nplastpass.pbkdf2(btoa(password), btoa(salt), num_iterations, num_bytes);
    if (typeof(callback) == 'function') {
      callback(AES.hex2bin(retval), password, num_iterations);
    }
    return retval;
  } else if ((typeof(g_oldpbkdf2) == 'undefined' || g_oldpbkdf2 != 1) && typeof(have_pplastpass) == 'function' && have_pplastpass() && typeof(callback) == 'function') {
    // chrome pplastpass binary case
    return pplastpass_send_message({cmd: 'pbkdf2', password: btoa(password), salt: btoa(salt), num_iterations: parseInt(num_iterations), num_bytes: num_bytes}, function(retval) { callback(AES.hex2bin(retval), password, num_iterations); });
  } else if (typeof(lptoolband)!="undefined" && typeof(lptoolbandcall) != 'undefined') {
    //ie binary case
    var retval = lptoolbandcall(["lppbkdf2",btoa(password),btoa(salt),parseInt(num_iterations),num_bytes]);
    if(typeof(retval)!='string' || retval.length==0){
        //Fallback to JS, perhaps running an older extension
      return lp_sha2lib.pbkdf2(password, salt, num_iterations, num_bytes, callback);
    }
    if (typeof(callback) == 'function') {
      callback(AES.hex2bin(retval), password, num_iterations);
    }
    return retval;
  } else {
    return lp_sha2lib.pbkdf2(password, salt, num_iterations, num_bytes, callback);
  }
}

/**
 * Try to derive key asynchronously. Useful for avoiding slow script warnings. Falls back to synchronous method above on failure or if the proper web crypto APIs are unavailable.
 * @param {*} password
 * @param {*} salt
 * @param {*} num_iterations
 * @param {*} num_bytes
 * @param {*} callback
 */
function lp_pbkdf2(password, salt, num_iterations, num_bytes, callback)
{
    // Not all browsers support Web Cryptography
    // https://caniuse.com/#feat=cryptography
    if (callback && typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.importKey && crypto.subtle.deriveKey && crypto.subtle.exportKey) {
      var keyPromise = crypto.subtle.importKey(
        'raw',
        bin2ab(password),
        { name: 'PBKDF2' },
        false,
        [ 'deriveBits', 'deriveKey' ]
      ).then(function(key) {
        return crypto.subtle.deriveKey({
          name: 'PBKDF2',
          salt: bin2ab(salt),
          iterations: parseInt(num_iterations, 10),
          hash: 'SHA-256'
        },
        key,
        { name: 'AES-CBC', length: 256 },
        true,
        [ 'encrypt', 'decrypt' ]
        );
      }).then(function(key) {
        return crypto.subtle.exportKey('raw', key);
      }).then(function(buffer) {
        callback(ab2bin(buffer), password, num_iterations);
      }).catch(function() {
        //Oh no! We've been thrown into the abyss! Occurs in the Edge Webvault. Recover by doing things synchronously.
        lp_pbkdf2_sync(password, salt, num_iterations, num_bytes, callback);
      });
    }
    else {
      return lp_pbkdf2_sync(password, salt, num_iterations, num_bytes, callback);
    }
}

function SHA256lib()
{
    function Utf8Encode(string) {
        if (string == null) {
          string = '';
        }
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    }

    function b64FromBytes(b2, b1, b0, n) {
        // crypt-specific b64 charset

        var chars = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        var w = (b2 << 16) | (b1 << 8) | b0;
        out = "";
        for (var i = 0; i < n; i++) {
            out += chars.charAt(w & 0x3f);
            w = w >>> 6;
        }
        return out;
    }

    return {
        sha256: function(s, binary) {
            s = Utf8Encode(s);
            var s_bytes = [];
            for (var i=0; i < s.length; i++) {
                s_bytes[i] = s.charCodeAt(i);
            }
            s = sjcl.codec.bytes.toBits(s_bytes);
            var bin_hash = sjcl.hash.sha256.hash(s, s.length * 8);
            if (typeof(binary)!='undefined' && true==binary) {
                var bytes = sjcl.codec.bytes.fromBits(bin_hash);
                var u32s = [];
                for (var i = 0; i < bytes.length / 4; i++) {
                    u32s[i] = bytes[4*i]     << 24 |
                              bytes[4*i + 1] << 16 |
                              bytes[4*i + 2] <<  8 |
                              bytes[4*i + 3];
                }
                return u32s;
            }
            return sjcl.codec.hex.fromBits(bin_hash);
        },

        sha512: function(s) {
            // for compatibility with jsSHA sha512 implementation, we
            // do _not_ automatically utf-8 encode strings here.
            // s = Utf8Encode(s);
            var s_bytes = [];
            for (var i=0; i < s.length; i++) {
                // jsSHA would also mask off high order bits here by ANDing
                // with 0xff, but that is broken.
                s_bytes[i] = s.charCodeAt(i);
            }
            s = sjcl.codec.bytes.toBits(s_bytes);
            var bin_hash = sjcl.hash.sha512.hash(s, s.length * 8);
            return sjcl.codec.hex.fromBits(bin_hash);
        },

        crypt_sha256: function(password, salt, num_iterations, callback) {

            var pw_bytes = [], salt_bytes = [];

            if (salt.length > 16) {
                salt = salt.substr(0, 16);
            }
            if (num_iterations < 1000) {
                num_iterations = 1000;
            }

            for (var i=0; i < password.length; i++) {
                pw_bytes[i] = password.charCodeAt(i);
            }
            for (i=0; i < salt.length; i++) {
                salt_bytes[i] = salt.charCodeAt(i);
            }
            password_bits = sjcl.codec.bytes.toBits(pw_bytes);
            salt_bits = sjcl.codec.bytes.toBits(salt_bytes);

            // steps from the spec:
            // https://www.akkadia.org/drepper/SHA-crypt.txt
            //
            // start digest A
            // the password string is added to digest A
            // the salt string is added to digest A
            var digestA = new sjcl.hash.sha256();
            digestA.update(password_bits);
            digestA.update(salt_bits);

            // start digestB
            // add the password to digest B
            // add the salt to digest B
            // add the password again to digest B
            // finish digest B
            var digestB = new sjcl.hash.sha256();
            digestB.update(password_bits);
            digestB.update(salt_bits);
            digestB.update(password_bits);
            var digestBFinal = digestB.finalize();

            // for every block of 32 bytes add digestB to digestA
            var cnt;
            for (cnt = password.length; cnt > 32; cnt -= 32) {
                digestA.update(digestBFinal);
            }
            // add remaining N bytes of digestB to digestA
            digestA.update(sjcl.bitArray.bitSlice(digestBFinal, 0, cnt * 8));

            // for each bit of the binary representation of the length
            // of the password, add either digestB or password string
            // if a 1 or 0
            for (cnt = password.length; cnt > 0; cnt >>=1) {
                if ((cnt & 1) !== 0)
                    digestA.update(digestBFinal);
                else
                    digestA.update(password_bits);
            }
            // finish digest A
            var digestAFinal = digestA.finalize();

            // DP: password length times
            var digestDP = new sjcl.hash.sha256();
            for (cnt = 0; cnt < password.length; cnt++) {
                digestDP.update(password_bits);
            }
            var digestDPFinal = digestDP.finalize();

            // create byte sequence P - digest padded to password length
            var p = [];
            for (cnt = password.length; cnt >= 32; cnt -= 32) {
                p = sjcl.bitArray.concat(p, digestDPFinal);
            }
            p = sjcl.bitArray.concat(p, sjcl.bitArray.bitSlice(digestDPFinal, 0, cnt * 8));

            // DS: salt repeated 16 + A[0] times
            var digestDS = new sjcl.hash.sha256();
            for (cnt = 0; cnt < 16 + sjcl.bitArray.extract(digestAFinal, 0, 8); cnt++) {
                digestDS.update(salt_bits);
            }
            var digestDSFinal = digestDS.finalize();

            // create byte sequence S
            var s = [];
            for (cnt = salt.length; cnt >= 32; cnt -= 32) {
                s = sjcl.bitArray.concat(s, digestDSFinal);
            }
            s = sjcl.bitArray.concat(s, sjcl.bitArray.bitSlice(digestDSFinal, 0, cnt * 8));

            // hashing rounds
            for (cnt = 0; cnt < num_iterations; cnt++) {
                var digestC = new sjcl.hash.sha256();
                if ((cnt & 1) === 1) {
                    // for odd rounds add P
                    digestC.update(p);
                } else {
                    // for even rounds add A/C
                    digestC.update(digestAFinal);
                }

                // add salt for !divisible by 3
                if ((cnt % 3) !== 0) {
                    digestC.update(s);
                }
                // add password for !divisible by 7
                if ((cnt % 7) !== 0) {
                    digestC.update(p);
                }
                // add key or A/C opposite to above
                if ((cnt & 1) === 1) {
                    digestC.update(digestAFinal);
                } else {
                    digestC.update(p);
                }

                // update intermediate result
                digestAFinal = digestC.finalize();
            }

            // now construct hash string
            var result = "$5$";
            if (num_iterations != 5000) {
                result += "rounds=" + num_iterations + "$";
            }
            result += salt + "$";

            var b = sjcl.codec.bytes.fromBits(digestAFinal);
            result += b64FromBytes(b[0], b[10], b[20], 4);
            result += b64FromBytes(b[21], b[1], b[11], 4);
            result += b64FromBytes(b[12], b[22], b[2], 4);
            result += b64FromBytes(b[3], b[13], b[23], 4);
            result += b64FromBytes(b[24], b[4], b[14], 4);
            result += b64FromBytes(b[15], b[25], b[5], 4);
            result += b64FromBytes(b[6], b[16], b[26], 4);
            result += b64FromBytes(b[27], b[7], b[17], 4);
            result += b64FromBytes(b[18], b[28], b[8], 4);
            result += b64FromBytes(b[9], b[19], b[29], 4);
            result += b64FromBytes(0, b[31], b[30], 3);

            if (typeof callback === "function") {
                callback(result);
                return;
            }
            return result;
        },

        pbkdf2: function(password, salt, num_iterations, num_bytes, callback) {
            // Password and salt come in as raw binary strings; they are
            // already encoded in whatever they should be encoded as.
            // SJCL will internally assume strings are utf8-encoded, so
            // we need to go ahead and convert to bit arrays for it.
            var pw_bytes = [], salt_bytes = [];
            for (var i=0; i < password.length; i++) {
                pw_bytes[i] = password.charCodeAt(i);
            }
            for (var i=0; i < salt.length; i++) {
                salt_bytes[i] = salt.charCodeAt(i);
            }
            password = sjcl.codec.bytes.toBits(pw_bytes);
            salt = sjcl.codec.bytes.toBits(salt_bytes);

            var bin_result = sjcl.misc.pbkdf2(password, salt,
                num_iterations, num_bytes * 8, null, callback, null);

            if (typeof callback === "function")
                return;

            var hex_result = sjcl.codec.hex.fromBits(bin_result);
            return hex_result;
        },

        utf8encode: function(s){
              return Utf8Encode(s);
            }
        };
}
