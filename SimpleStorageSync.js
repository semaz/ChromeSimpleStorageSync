function SimpleStorageSync() {
    "use strict";

    function getCacheKey(key, i) {
        return key + "_" + i;
    }

    function lengthUtf8(str) {
        return new Blob([str]).size;
    }

    function substrUTF8(str, n) {
        let len = Math.min(n, str.length);
        let i, cs, c = 0, bytes = 0;
        for (i = 0; i < len; i++) {
            c = str.charCodeAt(i);
            cs = 1;
            if (c >= 128) cs++;
            if (c >= 2048) cs++;
            if (c >= 0xD800 && c < 0xDC00) {
                c = str.charCodeAt(++i);
                if (c >= 0xDC00 && c < 0xE000) {
                    cs++;
                } else {
                    // you might actually want to throw an error
                    i--;
                }
            }
            if (n < (bytes += cs)) break;
        }

        return str.substr(0, i);
    }

    /**
     * Compresses an object, and breaks it into parts
     *
     * @param {string} key
     * @param {string} value
     * @param {function(): void=} callback
     */
    this.set = function(key, value, callback) {
        let str = LZStringUnsafe.compressToBase64(JSON.stringify(value)), i = 0, data = {},
            maxBytesPerItem = chrome.storage.sync.QUOTA_BYTES_PER_ITEM - 2,
            // since the key uses up some per-item quota, use
            // "maxValueBytes" to see how much is left for the value
            maxValueBytes, index, segment, counter;

        // split str into chunks and store them in an object indexed by `key_i`
        while(str.length > 0) {
            index = getCacheKey(key, i++);
            maxValueBytes = maxBytesPerItem - lengthUtf8(index);

            counter = maxValueBytes;
            segment = substrUTF8(str, counter);

            data[index] = segment;
            str = str.substr(segment.length);
        }

        // later used by get function
        data[key] = i;

        // remove useless parts of stored data
        chrome.storage.sync.clear(function() {
            chrome.storage.sync.set(data, callback);
        });
    };

    /**
     * Receives parts of stored data, combines them and decompresses
     *
     * @param {string} key
     * @param {function(string):void=} callback
     */
    this.get = function(key, callback) {
        chrome.storage.sync.get(null, result => {
            // check the existence of a limit
            if (key in result && result[key]) {
                let value = '', current;

                // collect data
                for (let i = 0; i <= result[key]; i++) {
                    current = result[getCacheKey(key, i)];
                    if (current === undefined) {
                        break;
                    }
                    value = value + current;
                }

                // decompress data
                callback(JSON.parse(LZStringUnsafe.decompressFromBase64(value)));
            } else {
                callback(null);
            }
        });
    };
}

// compression algorithm by https://github.com/openstyles/lz-string-unsafe
var LZStringUnsafe=function(){for(var n,r,e,t,u,o=0,l={},f=String.fromCharCode,i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+",c=(i+"/=").split(""),s=(i+"-$").split("");o<65;)o>62&&(l[s[o].charCodeAt(0)]=o),l[c[o].charCodeAt(0)]=o++;function a(o,l){for(var f=0;l>>=1;f++)r=o>>f&1|r<<1,++e===t&&(e=0,n.push(u(r)),r=0)}function h(n){return c[n]}function d(n){return s[n]}function g(n){return f(n+32)}function p(o,l,f){if(n=[],null!=o){r=0,e=0,t=l,u=f;var i=0,c=0,s=0,h=[3],d=[2,2,h],g=!0,p=0,m=3,A=4;if(o.length){a(s=(p=o.charCodeAt(0))<256?0:1,A),a(p,s?65536:256),d[1]=p;n:for(i=1;i<o.length;i++){for(p=o.charCodeAt(i),c=1;c<h.length;c+=2)if(h[c]==p){h=h[c+1];continue n}for(g?g=!1:a(h[0],A),c=1;d[c]!=p&&c<d.length;)c+=2;c==d.length&&(++m>=A&&(A<<=1),a(s=p<256?0:1,A),a(p,s?65536:256),d.push(p),d.push([m]),g=!0),h.push(p),h.push([++m]),m>=A&&(A<<=1),h=d[c+1]}for(g?g=!1:a(h[0],A),c=1;d[c]!=p&&c<d.length;)c+=2;c==d.length&&(++m>=A&&(A<<=1),a(s=p<256?0:1,A),a(p,s?65536:256)),++m>=A&&(A<<=1)}a(2,A),r<<=t-e,n.push(u(r))}return n}function m(n,r,e){for(var t,u=[0,1,2],o=4,l=4,i=3,c="",s=[],a="",h=0,d=2,g=0,p=e(0),m=r,A=1;g!=d;)h+=(p>>--m&1)<<g++,0==m&&(m=r,p=e(A++));if(2==h)return"";for(d=8*h+8,h=g=0;g!=d;)h+=(p>>--m&1)<<g++,0==m&&(m=r,p=e(A++));for(t=f(h),u[3]=t,a=t,s.push(t);A<=n;){for(d=i,h=g=0;g!=d;)h+=(p>>--m&1)<<g++,0==m&&(m=r,p=e(A++));if(h<2){for(d=8+8*h,h=g=0;g!=d;)h+=(p>>--m&1)<<g++,0==m&&(m=r,p=e(A++));u[l]=f(h),h=l++,0==--o&&(o=1<<i++)}else if(2==h)return s.join("");if(h>u.length)return null;c=h<u.length?u[h]:a+a.charAt(0),s.push(c),u[l++]=a+c.charAt(0),a=c,0==--o&&(o=1<<i++)}return""}function A(n){return p(n,16,f)}function C(n){return null==n?"":0==n.length?null:m(n.length,16,function(r){return n[r].charCodeAt(0)})}return{compressToBase64:function(n){if(null==n)return"";for(var r=p(n,6,h),e=r.length%4;e--;)r.push("=");return r.join("")},decompressFromBase64:function(n){return null==n?"":""==n?null:m(n.length,6,function(r){return l[n.charCodeAt(r)]})},compressToUTF16:function(n){if(null==n)return"";var r=p(n,15,g);return r.push(" "),r.join("")},decompressFromUTF16:function(n){return null==n?"":""==n?null:m(n.length,15,function(r){return n.charCodeAt(r)-32})},compressToUint8Array:function(n){for(var r=A(n),e=new Uint8Array(2*r.length),t=0,u=r.length;t<u;t++){var o=r[t].charCodeAt(0);e[2*t]=o>>>8,e[2*t+1]=255&o}return e},decompressFromUint8Array:function(n){return null===n||void 0===n?C(n):0==n.length?null:m(n.length,8,function(r){return n[r]})},compressToEncodedURIComponent:function(n){return null==n?"":p(n,6,d).join("")},decompressFromEncodedURIComponent:function(n){return null==n?"":""==n?null:m((n=n.replace(/ /g,"+")).length,6,function(r){return l[n.charCodeAt(r)]})},compress:function(n){return A(n).join("")},compressToArray:A,decompress:function(n){return null==n?"":""==n?null:m(n.length,16,function(r){return n.charCodeAt(r)})},decompressFromArray:C}}();"function"==typeof define&&define.amd?define(function(){return LZStringUnsafe}):"undefined"!=typeof module&&null!=module?module.exports=LZStringUnsafe:"undefined"!=typeof angular&&null!=angular&&angular.module("LZStringUnsafe",[]).factory("LZStringUnsafe",function(){return LZStringUnsafe});
