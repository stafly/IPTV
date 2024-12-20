// ==UserScript==
// @name         qingwa-torrent-assistant
// @namespace    http://tampermonkey.net/
// @version      1.0.9
// @description  不可蛙-审种助手
// @author       qingwa.pro@jaycode
// @match        *://*.qingwapt.com/details.php*
// @match        *://*.qingwa.pro/details.php*
// @icon         https://qingwapt.com/favicon.ico
// @require      https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/490095/qingwa-torrent-assistant.user.js
// @updateURL https://update.greasyfork.org/scripts/490095/qingwa-torrent-assistant.meta.js
// ==/UserScript==

/*
 * 改自Agsv-Torrent-Assistant
 */

(function() {
    'use strict';

    var isWaitImgLoad = true;

    // 自定义参数
    var review_info_position = 3;  // 错误提示信息位置：1:页面最上方，2:主标题正下方，3:主标题正上方
    var fontsize = "9pt";          // 一键通过按钮的字体大小
    var timeout = 200;             // 弹出页内鼠标点击间隔，单位毫秒，设置越小点击越快，但是对网络要求更高
    var biggerbuttonsize = "40pt"; // 放大的按钮大小
    var autoback = 0;              // 一键通过后返回上一页面

    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    if (isMobile){
        biggerbuttonsize = "120pt";
        autoback = 1;
    }

    var cat_constant = {
        401: '电影',
        402: '剧集',
        403: '综艺',
        404: '纪录片',
        405: '动漫',
        406: 'MV',
        407: '体育',
        408: '音乐',
        412: '短剧',
        409: '其他'
    };

    var type_constant = {
        1: 'UHD Blu-ray',
        8: 'Blu-ray',
        9: 'Remux',
        10: 'Encode',
        7: 'WEB-DL',
        4: 'HDTV',
        2: 'DVD',
        3: 'CD',
        5: 'Track',
        6: 'Other'
    };

    var encode_constant = {
        1: 'H.264/AVC',
        6: 'H.265/HEVC',
        2: 'VC-1',
        4: 'MPEG-2',
        7: 'AV1',
        3: 'MPEG-4',
        8: 'VP9',
        5: 'Other'
    };

    var audio_constant = {
        9: 'DTS:X',
        14: 'DTS',
        10: 'DTS-HD MA',
        11: 'TrueHD Atmos',
        12: 'TrueHD',
        13: 'LPCM',
        15: 'DD/AC3',
        16: 'DDP/E-AC3',
        1: 'FLAC',
        17: 'AAC',
        18: 'APE',
        19: 'WAV',
        4: 'MP3',
        8: 'M4A',
        20: 'OPUS',
        7: 'Other'
    };

    var resolution_constant = {
        6: '8K',
        7: '4K',
        1: '1080p',
        2: '1080i',
        3: '720p',
        4: 'SD',
        5: 'Other'
    };

    var group_constant = {
        6: 'FROG',
        7: 'FROGE',
        8: 'FROGWeb',
        9: 'GodDramas ',
        5: 'Other'
    }

    const brief = $("#kdescr").text().toLowerCase();          // 获取元素的文本内容
    const Brief = $("#kdescr").text();
    //console.log("brief:", brief);
    const containsIMDbLink = brief.includes("imdb.com");       // 检查内容是否包含 imdb.com 链接
    const containsDoubanLink = brief.includes("douban.com");   // 检查内容是否包含 douban.com 链接
    const containsTMDBLink = brief.includes("themoviedb.org"); // 检查内容是否包含 themoviedb.org 链接

    var dbUrl; // 是否包含影片链接
    if (containsIMDbLink || containsDoubanLink || containsTMDBLink) {
        dbUrl = true;
        //console.log("内容中包含 IMDb 或 Douban 链接");
    } else {
        dbUrl = false;
        //console.log("内容中不包含 IMDb 或 Douban 链接");
    }

    var find_season_episod = function(text) {
        if (title.match(/\bS\d\d/)) {
            if (title.match(/\bS\d+\s?E\d+/)) return 0;
            if (title.match(/\bS\d+-/)) return 2; //multi seasons case
            return 1;
        }
        return -1;
    }

    var find_info = function(text) {
        if (text.includes("Complete name") && text.includes("Movie name") && text.includes("Video")) return 0;

        if (text.includes("Complete name") && text.includes("General") && text.includes("Video")) return 0;

        if (text.includes("File name") && text.includes("General") && text.includes("Video")) {
            //旧版本mediainfo
            return 0;
        }

        if (text.includes("DISC INFO") || text.includes("Disc Title:") || text.includes("Disc Label:")) return 1;

        return -1;
    }

    var isBriefContainsInfo = false;  //是否包含Mediainfo
    if (Brief.includes("Complete name") && Brief.includes("Movie name") && Brief.includes("Video")) {
        isBriefContainsInfo = true;
        // console.log("简介中包含Mediainfo");
    }

    if (Brief.includes("Complete name") && Brief.includes("General") && Brief.includes("Video")) {
        isBriefContainsInfo = true;
        // console.log("简介中包含Mediainfo");
    }

    if (Brief.includes("File name") && Brief.includes("General") && Brief.includes("Video")) {
		//旧版本mediainfo
        isBriefContainsInfo = true;
        // console.log("简介中包含Mediainfo");
    }

    if (Brief.includes("DISC INFO") || Brief.includes("Disc Title:") || Brief.includes("Disc Label:")) {
        isBriefContainsInfo = true;
    }
    //错误info信息
    /*
    // 中文详细info
    if (brief.includes("概览") && brief.includes("视频") && brief.includes("音频")) {
        isBriefContainsInfo = true;
        // console.log("简介中包含Mediainfo");
    }
    if (brief.includes("nfo信息")) {
        isBriefContainsInfo = true;
    }
    if (brief.includes("release date") && brief.includes("source")) {
        isBriefContainsInfo = true;
    }
    if (brief.includes("release.name") || brief.includes("release.size")) {
        isBriefContainsInfo = true;
    }
    if ((brief.includes("文件名") || brief.includes("文件名称")) && (brief.includes("体　积")||brief.includes("体　　积"))) {
        isBriefContainsInfo = true;
    }
    if (brief.includes("source type") || brief.includes("video bitrate")) {
        isBriefContainsInfo = true;
    } */

    var isBriefContainsForbidReseed = false;  //是否包含禁止转载
    if (brief.includes("禁止转载")) {
        isBriefContainsForbidReseed = true;
    }


    var title = $('#top').text();
    var exclusive = 0;
    if (title.indexOf('禁转') >= 0) {
        exclusive = 1;
    }
    title = title.replace(/禁转|\((已审|冻结|待定)\)|\[(免费|50%|2X免费|30%|2X 50%)\]|\(限时\d+.*\)|\[2X\]|\[(推荐|热门|经典|已审)\]/g, '').trim();
    title = title.replace(/剩余时间.*/g,'').trim();
    title = title.replace("(禁止)",'').trim();
    // console.log(title);
    var title_lowercase = title.toLowerCase();

    var officialSeed = 0; //官组种子
    var godDramaSeed = 0; //驻站短剧组种子
    var officialMusicSeed = 0; //官组音乐种子
    var isVCBStudio = false;  //VCB-Studio
    if(title_lowercase.includes("frog") || title_lowercase.includes("froge") || title_lowercase.includes("frogweb") || title.includes("Loong@QingWa")) {
        officialSeed = 1;
        //console.log("官种");
    }
    // 预留，不影响判断
    if(title_lowercase.includes("frogmus")) {
        officialMusicSeed = 1;
        //console.log("音乐官种");
    }
    // 预留，不影响判断
    if(title_lowercase.includes("goddramas")) {
        godDramaSeed = 1;
        //console.log("短剧种");
    }
    if(title_lowercase.includes("vcb-studio")) {
        isVCBStudio = 1;
        //console.log("VCB-Studio种");
    }

    // console.log("title_lowercase:"+title_lowercase);
    var title_type, title_encode, title_audio, title_resolution, title_group, title_is_complete, title_is_episode, title_x265, title_x264;
    var title_DVD720 = false;

    let title_wrongBD = title.match(/Blu[Rr]ay|Blu-Ray|BDMV|BLURAY/);
    let title_wrongBDrip = title.match(/BD[Rr]ip|Blu-?ray|Blu-Ray|BLURAY/);
    let title_HEVC = title.includes(" HEVC");
    let title_AVC = title.includes(" AVC");
    let title_10bit = title.includes("10bit");

    let title_resolution_pos = title.search(/\b((2160|1080|720|576|480)[pi])/);
    let title_source_pos = title.search(/BLU-?RAY|Blu-?[Rr]ay|WEB[- ]?DL|Remux|REMUX|(BD|DVD|WEB)[Rr]ip|BDMV|\bBD\b|\bDVD[5|9]?\b|\bU?HDTV/);
    let title_HDR_pos = title.search(/\b(DV|DoVi|HDR|HLG)/);
    let title_video_pos = title.search(/\b(HEVC|AVC|AV1|VP9|VC-1|MPEG-?[24]|(H\.?|x)26[45])/);
    let title_audio_pos = title.replace('WAVVE','WAAAE').search(/\b(AAC|(E-?)?AC3|\bDD|TrueHD|DTS|FLAC|LPCM|OPUS|WAV|MP[123]|M4A|APE)/);

    let title_ES = find_season_episod(title);
    let title_encode_system = title.match(/\b(NTSC|PAL)/);

    let title_audio_complete = title.match(/\b(DD[P\+]?|FLAC|LPCM|AC3|MP[123]|OPUS|DTS([: -]?X|-?HD ?(M|HR)A)?) ?(\d[ \.]?\d)?/);
    let title_AC3 = title.includes(' AC3');

    // 媒介
    if(title_lowercase.includes("web-dl") || title_lowercase.includes("webdl")){
        title_type = 7;
    } else if (title_lowercase.includes("remux")) {
        title_type = 9;
    } else if (((title_lowercase.includes("blu-ray") || title_lowercase.includes("bluray")) && !(title.includes(" HEVC") || title.includes(" AVC") || title.includes(" VC-1") || title.match(/\bMPEG-?[24]/)))) {
        title_type = 10;
    } else if (title_lowercase.includes("webrip") || title_lowercase.includes("dvdrip") || title_lowercase.includes("bdrip") || title_lowercase.includes("x265") || title_lowercase.includes("x264")) {
        title_type = 10;
    } else if (title_lowercase.includes("uhd blu-ray") || title_lowercase.includes("uhd bluray")) {
        title_type = 1;
    } else if (title_lowercase.includes("blu-ray") || title_lowercase.includes("bluray")) {
        title_type = 8;
    } else if (title_lowercase.includes("hdtv")) {
        title_type = 4;
    } else if (title.includes(" DVD")) {
        title_type = 2;
    } else if (title_lowercase.includes("cd")) {
        title_type = 3;
    } else if (title_lowercase.includes("track")) {
        title_type = 5;
    }

    // 视频编码
    if(title_lowercase.includes("264") || title_lowercase.includes("avc")){
        title_encode = 1;
    } else if (title_lowercase.includes("265") || title_lowercase.includes("hevc")) {
        title_encode = 6;
    } else if (title_lowercase.includes("vc") || title_lowercase.includes("vc-1")) {
        title_encode = 2;
    } else if (title_lowercase.includes("mpeg2") || title_lowercase.includes("mpeg-2")) {
        title_encode = 4;
    } else if (title_lowercase.includes("av1") || title_lowercase.includes("av-1")) {
        title_encode = 7;
    } else if (title_lowercase.includes("mpeg4") || title_lowercase.includes("mpeg-4")) {
        title_encode = 3;
    } else if (title_lowercase.includes("vp9") || title_lowercase.includes("vp-9")) {
        title_encode = 8;
    }
    //console.log("title_encode:"+title_encode);

    // 音频 可能有多个音频，选择与标题不一致，跳过
    if (title.includes("FLAC")) {
        title_audio = 1;
    } else if (title.includes("LPCM")) {
        title_audio = 13;
    } else if (title.includes(" DDP") || title.includes(" DD+") || title.search(/E-?AC-?3/) != -1) {
        title_audio = 16;
    } else if (title.includes(" DD") || title.includes(" AC3")) {
        title_audio = 15;
    } else if (title_lowercase.includes("truehd") && title_lowercase.includes("atmos")) {
        title_audio = 11;
    } else if (title.search(/TrueHD ?7[ \.]?1/) != -1) {
		title_audio = 11;
    } else if (title_lowercase.includes("dts-hd") || title_lowercase.includes("dts hd")) {
        title_audio = 10;
    } else if (title_lowercase.includes("dts:x") || title_lowercase.includes("dts-x") || title_lowercase.includes("dts: x") || title_lowercase.includes("dtsx")) {
        title_audio = 9;
    } else if (title_lowercase.includes("truehd")) {
        title_audio = 12;
    } else if (title.includes(" DTS")) {
        title_audio = 14;
    } else if (title.includes("AAC")) {
        title_audio = 17;
    } else if (title_lowercase.includes("ape")) {
        title_audio = 18;
    } else if (title_lowercase.includes("wav")) {
        title_audio = 19;
    } else if (title_lowercase.includes("mp3")) {
        title_audio = 4;
    } else if (title_lowercase.includes("m4a")) {
        title_audio = 8;
    } else if (title.includes(" OPUS")) {
        title_audio = 20;
    }

    // 分辨率
    if(title_lowercase.includes("1080p")){
        title_resolution = 1;
    } else if(title_lowercase.includes("1080i")){
        title_resolution = 2;
    } else if (title_lowercase.includes("720p") || title_lowercase.includes("720i")) {
        title_resolution = 3;
    } else if (title.includes(" SD ")) {
        title_resolution = 4;
    } else if (title_lowercase.includes("8k") || title_lowercase.includes("4320p") || title_lowercase.includes("4320i")) {
        title_resolution = 6;
    } else if (title_lowercase.includes("4k") || title_lowercase.includes("2160p") || title_lowercase.includes("2160i") || title_lowercase.includes("uhd")) {
        title_resolution = 7;
    }

    if (title_lowercase.includes("complete")) {
        title_is_complete = true;
    }

    if (title_lowercase.match(/s\d+e\d+/i) || title_lowercase.match(/ep\d+/i)) {
        title_is_episode = true;
        console.log("===============================当前为分集");
    }

    if (title_lowercase.includes("x265")) {
        title_x265 = true;
    }
    if (title_lowercase.includes("x264")) {
        title_x264 = true;
    }

    if (title.includes(" DVD") && title_resolution == 3) {
        title_DVD720 = true;
    }

    var subtitle, cat, type, encode, audio, resolution, area, group, anonymous, category;
    var poster;
    var fixtd, douban, imdb, mediainfo, mediainfo_short,mediainfo_err;
    var isGroupSelected = false;     //是否选择了制作组
    var isMediainfoEmpty = false;    //Mediainfo栏内容是否为空
    var isInfoCorrect = false;       //检查info信息是否正确
    var isBiggerThan1T = false;      //种子体积是否大于1T
    // 禁转 官方 中字 国语 粤语 完结 VCB-Studio DIY 原生原盘 Remux 杜比视界 HDR HDR10+ 合集 驻站
    var isReseedProhibited = false;  //禁转
    var isOfficialSeedLabel = false; //官方
    var isTagTextChinese = false;    //中字
    var isTagAudioMandarin = false;   //国语
    var isTagAudioCantonese = false;   //粤语
    var isTagVCBStudio = false;      //VCB-Studio
    var isTagResident = false;       //标签是否选择驻站
    var isAudioMandarin = false;
    var isAudioCantonese = false;
    var isTextChinese = false;
    var isTextEnglish = false;

    var isTagComplete = false;
    var isTagIncomplete = false;
    var isTagCollection = false;

    var mi_x265 = false;
    var mi_x264 = false;
    var mi_type;

    var isTagDIY = false;
    var isTagUNTOUCHED = false;
    var isTagREMUX = false;

    var isTagDV = false;
    var isTagHDR = false;
    var isTagHDR10P = false;
    var isDV = false;
    var isHDR = false;
    var isHDR10P = false;
    var isDIY = title.match(/(BHYS|sGnb|SPM|D[Ii]Y)@/);

    var tdlist = $('#outer').find('td');
    for (var i = 0; i < tdlist.length; i ++) {
        var td = $(tdlist[i]);
        if (td.text() == '副标题' || td.text() == '副標題') {
            subtitle = td.parent().children().last().text();
            if (subtitle.includes("DIY")) isDIY = true;
        }

        if (td.text() == '添加') {
            var text = td.parent().children().last().text();
            if (text.indexOf('匿名') >= 0) {
                anonymous = 1;
            }
        }

        if (td.text() == '标签') {
            var text = td.parent().children().last().text();
            //console.log('标签: '+text);
            if(text.includes("禁转")){
                isReseedProhibited = true;
                // console.log("已选择禁转标签");
            }
            if(text.includes("官方")){
                isOfficialSeedLabel = true;
                // console.log("已选择官方标签");
            }
            if(text.includes("国语")){
                isTagAudioMandarin = true;
                // console.log("已选择国语标签");
            }
            if(text.includes("粤语")){
                isTagAudioCantonese = true;
                // console.log("已选择粤语标签");
            }
            if(text.includes("中字")){
                isTagTextChinese = true;
                // console.log("已选择中字标签");
            }
            if(text.includes("VCB-Studio")){
                isTagVCBStudio = true;
                // console.log("已选择VCB-Studio标签");
            }
            if (text.indexOf('完结') >= 0) {
                isTagComplete = true;
            }

            if (text.includes('分集')) {
                isTagIncomplete = true;
            }

            if (text.includes('合集')) {
                isTagCollection = true;
            }

            if(text.includes("驻站")){
                isTagResident = true;
                // console.log("已选择驻站标签");
            }

            if(text.includes("DIY")){
                isTagDIY = true;
                // console.log("已选择DIY标签");
            }
            if(text.includes("原生原盘")){
                isTagUNTOUCHED = true;
                // console.log("已选择原生原盘标签");
            }
            if(text.includes("Remux")){
                isTagREMUX = true;
                // console.log("已选择Remux标签");
            }

            if(text.includes("杜比视界")){
                isTagDV = true;
                // console.log("已选择杜比视界标签");
            }
            if((!text.includes("HDR10+") && text.includes("HDR")) || text.match(/HDR[^1]/)){
                isTagHDR = true;
                // console.log("已选择HDR10标签");
            }
            if(text.includes("HDR10+")){
                isTagHDR10P = true;
                // console.log("已选择HDR10+标签");
            }
        }


        if (td.text() == '基本信息') {
            var text = td.parent().children().last().text();
            //console.log("类型:", text);
            if(text.includes("制作组")){
                isGroupSelected = true;
                //console.log("已选择制作组");
            }
            if(text.includes("TB")){
                isBiggerThan1T = true;
                //console.log("种子体积大于1T");
            }
            // 类型
            Object.keys(cat_constant).some(key => {
                if (text.indexOf(cat_constant[key]) >= 0) {
                    cat = Number(key);
                    return true;
                }
            })
            //console.log("cat:", cat, cat_constant[cat]);

            // 媒介
            Object.keys(type_constant).some(key => {
                if (text.indexOf('媒介: ' + type_constant[key]) >= 0) {
                    type = Number(key);
                    return true;
                }
            })
            //console.log("type:", type, type_constant[type]);

            // 编码
            let text_no_audio = text.replace(/音频编码/, 'AUDIO');
            Object.keys(encode_constant).some(key => {
                if (text_no_audio.indexOf('编码: ' + encode_constant[key]) >= 0) {
                    encode = Number(key);
                    return true;
                }
            })
            //console.log("encode:", encode, encode_constant[encode]);

            // 音频编码
            Object.keys(audio_constant).some(key => {
                if (text.indexOf('音频编码: ' + audio_constant[key]) >= 0) {
                    audio = Number(key);
                    return true;
                }
            })
            //console.log("audio:", audio, audio_constant[audio]);

            // 分辨率
            Object.keys(resolution_constant).some(key => {
                if (text.indexOf('分辨率: ' + resolution_constant[key]) >= 0) {
                    resolution = Number(key);
                    return true;
                }
            })
            if (text.indexOf('720i') >= 0) {
                resolution = 3;
            }
            if (text.indexOf('480p') >= 0 || text.indexOf('480i') >= 0 || text.indexOf('360p') >= 0 || text.indexOf('360i') >= 0) {
                resolution = 4;
            }
            //console.log("resolution:", resolution, resolution_constant[resolution]);

            // 制作组
            Object.keys(group_constant).some(key => {
                if (text.indexOf('制作组: ' + group_constant[key]) >= 0) {
                    category = Number(key);
                    return true;
                }
            })
            //console.log("category:", category, group_constant[category]);
        }

        if (td.text() == '副标题' || td.text() == '副標題') {
            subtitle = td.parent().children().last().text();
        }

        if (td.text() == '行为') {
            fixtd = td.parent().children().last();
        }

        if (td.text().trim() == '海报') {
            poster = $('#kposter').children().attr('src');
        }
        /* if (td.text().trim() == "IMDb信息") {
            if (td.parent().last().find("a").text() == "这里"){
                var fullUrl = new URL(href, window.location.origin).toString();
                td.parent().find("a").attr("href",fullUrl);
                let href = td.parent().last().find("a").attr("href").trim();
                td.parent().last().find("a").click();
            }
        }*/
        if (td.text() == "MediaInfo"){
            //$(this).find("")
            let md = td.parent().children().last();
            if(md == undefined || md.text().trim()==""){
                isMediainfoEmpty = true;
                //console.log("MediaInfo栏为空");
            }
            mi_type = find_info(md.text());
            //console.log(md.text())
            //console.log(md.children('div').length)
            //console.log(md.children('table').length)
            if (md.children('div').length>0) {
                mediainfo_short = md.text().replace(/\s+/g, '');
                mediainfo = md.text().replace(/\s+/g, '');
            } else if  (md.children('table').length>0) {
                mediainfo_short = md.children().children().children().eq(0).text().replace(/\s+/g, '');
                mediainfo = md.children().children().children().eq(1).text().replace(/\s+/g, '');
            }
            if ((containsBBCode(mediainfo) || containsBBCode(mediainfo_short)) && mediainfo_short === mediainfo){
                mediainfo_err = "MediaInfo中含有bbcode"
            }

            // 根据 Mediainfo 判断标签选择
            //console.log("===========================mediainfo:"+mediainfo);
            const audioMatch = mediainfo.matchAll(/Audio.*?Language:(\w+)/g) || [];
            for (let audioOne of audioMatch) {
                //const audioLanguage = audioOne.match(/Language:(\w+)/)[1];
                // console.log(`The languages of the Audio are: ${audioLanguage}`);
                const audioLanguage = audioOne[1];
                if (audioOne[0].includes("Text")) {
                    continue;
                }
                if (audioLanguage.includes("Chinese")) {
                    if (subtitle.includes("粤")) {
                        isAudioCantonese = true;
                    } else {
                        isAudioMandarin = true;
                    }
                    if (subtitle.includes("国语") || subtitle.includes("国配") || subtitle.includes("国粤")) {
                        isAudioMandarin = true;
                    }
                }
                if (audioLanguage.includes("Mandarin")){
                    isAudioMandarin = true;
                }
                if (audioLanguage.includes("Cantonese")){
                    isAudioCantonese = true;
                }
            }

            const textMatches = mediainfo.match(/Text.*?Language:(\w+)/g) || [];
            const textLanguages = textMatches.map(text => {
                const match = text.match(/Language:(\w+)/);
                return match ? match[1] : 'Not found';
            });
            var textLanguage = textLanguages.join(',')
            // console.log(`The languages of the text are: ${textLanguage}`);
            if (textLanguage.includes("Chinese")){
                isTextChinese = true;
            }
            if (textLanguage.includes("English")){
                isTextEnglish = true;
            }
            if (mediainfo.includes("x264")){
                mi_x264 = true;
            }
            if (mediainfo.includes("x265")){
                mi_x265 = true;
            }
            // alert(isAudioChinese.toString() + isTextChinese.toString() + isTextEnglish.toString());
            if (mediainfo.includes("dvhe.") || mediainfo.includes("Dolby Vision")) {
                isDV = true;
            }
            if (mediainfo.includes("SMPTE ST 2086") || mediainfo.includes("HDR10\w") || mediainfo.includes("HLG")) {
                isHDR = true;
            }
            if (mediainfo.includes("SMPTE ST 2094") || mediainfo.includes("HDR10+")) {
                isHDR10P = true;
                isHDR = true;
            }
        }
    }

    function containsBBCode(str) {
        // 创建一个正则表达式来匹配 [/b]、[/color] 等结束标签
        const regex = /\[\/(b|color|i|u|img)\]/;

        // 使用正则表达式的 test 方法来检查字符串
        return regex.test(str);
    }

    let imdbUrl = $('#kimdb a').attr("href")
    /* if (imdbText.indexOf('douban') >= 0) {
        douban = $(element).attr('title');
    } */
    // console.log(imdbUrl)
    /* if (imdbText.indexOf('imdb') >= 0) {
        imdb = $(element).attr('title');
    } */

    var screenshot = '';
    var pngCount = 0;
    var imgCount = 0;
    $('#kdescr img').each(function(index, element) {
        var src = $(element).attr('src');
        if(src != undefined) {
            if (index != 0) {
                screenshot += '\n';
            }
            screenshot += src.trim();
        }
        if (src.indexOf('.png') >= 0) {
            pngCount++;
        }
        imgCount++;
    });

    let error = false;
    let warning = false;

    switch(review_info_position) {
        case 1:
            $('#outer').prepend('<div style="display: inline-block; padding: 10px 30px; color: black; background: #ffdd59; font-weight: bold; border-radius: 5px; margin: 4px"; display: block; position: fixed;bottom: 0;right: 0;box-shadow: 0 0 10px rgba(0,0,0,0.5); id="assistant-tooltips-warning"></div><br>');
            $('#outer').prepend('<div style="display: inline-block; padding: 10px 30px; color: white; background: #F44336; font-weight: bold; border-radius: 5px; margin: 4px"; display: block; position: fixed;bottom: 0;right: 0;box-shadow: 0 0 10px rgba(0,0,0,0.5); id="assistant-tooltips"></div><br>');
            break;
        case 2:
            $('#top').after('<div style="display: inline-block; padding: 10px 30px; color: white; background: #F44336; font-weight: bold; border-radius: 5px; margin: 0px"; display: block; position: fixed;bottom: 0;right: 0;box-shadow: 0 0 10px rgba(0,0,0,0.5); id="assistant-tooltips"></div><br><div style="display: inline-block; padding: 10px 30px; color: black; background: #ffdd59; font-weight: bold; border-radius: 5px; margin: 4px"; display: block; position: fixed;bottom: 0;right: 0;box-shadow: 0 0 10px rgba(0,0,0,0.5); id="assistant-tooltips-warning"></div><br>');
            break;
        case 3:
            $('#top').before('<div style="display: inline-block; padding: 10px 30px; color: white; background: #F44336; font-weight: bold; border-radius: 5px; margin: 0px"; display: block; position: fixed;bottom: 0;right: 0;box-shadow: 0 0 10px rgba(0,0,0,0.5); id="assistant-tooltips"></div><br><div style="display: inline-block; padding: 10px 30px; color: black; background: #ffdd59; font-weight: bold; border-radius: 5px; margin: 4px"; display: block; position: fixed;bottom: 0;right: 0;box-shadow: 0 0 10px rgba(0,0,0,0.5); id="assistant-tooltips-warning"></div><br>');
            break;
        default:
            $('#top').after('<div style="display: inline-block; padding: 10px 30px; color: white; background: #F44336; font-weight: bold; border-radius: 5px; margin: 0px"; display: block; position: fixed;bottom: 0;right: 0;box-shadow: 0 0 10px rgba(0,0,0,0.5); id="assistant-tooltips"></div><br><div style="display: inline-block; padding: 10px 30px; color: black; background: #ffdd59; font-weight: bold; border-radius: 5px; margin: 4px"; display: block; position: fixed;bottom: 0;right: 0;box-shadow: 0 0 10px rgba(0,0,0,0.5); id="assistant-tooltips-warning"></div><br>');
    }

    $('#assistant-tooltips').append('【错误】: ');
    $('#assistant-tooltips-warning').append('【警告】: ');

    /* if (/\s+/.test(title)) {
        $('#assistant-tooltips').append('主标题包含空格<br/>');
        error = true;
    } */
    if(/[^\x00-\xff]+/g.test(title) && !title.includes('￡') && !title.includes('™') && !/[\u2161-\u2169]/g.test(title) && !title.includes('Ⅰ')) {
        $('#assistant-tooltips').append('主标题包含中文或中文字符<br/>');
        error = true;
    }
    if (!subtitle) {
        $('#assistant-tooltips').append('副标题为空<br/>');
        error = true;
    }
    if (!cat) {
        $('#assistant-tooltips').append('未选择分类<br/>');
        error = true;
    }
    if (!type) {
        $('#assistant-tooltips').append('未选择媒介<br/>');
        error = true;
    } else {
        // console.log("标题检测格式为" + type_constant[title_type] + "，选择格式为" + type_constant[type]);
        if (title_type && title_type !== type) {
            $('#assistant-tooltips').append("标题检测媒介为" + type_constant[title_type] + "，选择媒介为" + type_constant[type] + '<br/>');
            error = true;
        }
    }
    if (!encode) {
        $('#assistant-tooltips').append('未选择主视频编码<br/>');
        error = true;
    } else {
        if (title_encode && title_encode !== encode) {
            // console.log("标题检测视频编码为" + encode_constant[title_encode] + "，选择视频编码为" + encode_constant[encode]);
            $('#assistant-tooltips').append("标题检测视频编码为" + encode_constant[title_encode] + "，选择视频编码为" + encode_constant[encode] + '<br/>');
            error = true;
        }
    }
    if (!audio) {
        $('#assistant-tooltips').append('未选择主音频编码<br/>');
        error = true;
    } else {
        if (title_audio && title_audio !== audio) {
            // console.log("标题检测音频编码为" + audio_constant[title_audio] + "，选择音频编码为" + audio_constant[audio]);
            // $('#assistant-tooltips-warning').append("标题检测音频编码为" + audio_constant[title_audio] + "，选择音频编码为" + audio_constant[audio] + '<br/>');
            // warning = true;
            $('#assistant-tooltips').append("标题检测音频编码为" + audio_constant[title_audio] + "，选择音频编码为" + audio_constant[audio] + '<br/>');
            error = true;
        }
    }
    if (!resolution) {
        $('#assistant-tooltips').append('未选择分辨率<br/>');
        error = true;
    } else {
        if (title_resolution && title_resolution !== resolution) {
            $('#assistant-tooltips').append("标题检测分辨率为" + resolution_constant[title_resolution] + "，选择分辨率为" + resolution_constant[resolution] + '<br/>');
            error = true;
        }
    }

    if (title_resolution_pos == -1) {
        if (title_type == 2 || title_type == 9) {
            if (!title_encode_system) {
                $('#assistant-tooltips').append('标题中缺少分辨率或制式<br/>');
                error = true;
            }
        } else {
            $('#assistant-tooltips').append('标题中缺少分辨率<br/>');
            error = true;
        }
    }

    if (title_source_pos == -1) {
        $('#assistant-tooltips').append('标题中缺少来源或媒介<br/>');
        error = true;
    }

    if (title_resolution_pos != -1 && title_source_pos != -1) {
        if (title_resolution_pos > title_source_pos) {
            $('#assistant-tooltips').append('标题中分辨率在来源/媒介后<br/>');
            error = true;
        }
    }

    if (title_video_pos == -1) {
        $('#assistant-tooltips').append('标题中缺少视频编码<br/>');
        error = true;
    }

    if (title_audio_pos == -1) {
        $('#assistant-tooltips').append('标题中缺少音频编码<br/>');
        error = true;
    }

    if (title_AC3) {
        $('#assistant-tooltips').append('AC3改为DD<br/>');
        error = true;
    }

    if (title_audio_complete) {
        if (!title_audio_complete[0].match(/\d\.\d/)) {
            $('#assistant-tooltips').append('标题中未正确标示声道数<br/>');
            error = true;
        }
    }

    if (title_video_pos != -1 && title_audio_pos != -1) {
        if (title_video_pos > title_audio_pos) {
            $('#assistant-tooltips').append('标题中视频编码在音频编码后<br/>');
            error = true;
        }
        if (title_HDR_pos > title_video_pos) {
            $('#assistant-tooltips').append('标题中HDR类型在视频编码后<br/>');
            error = true;
        }
        if (title_HDR_pos > title_audio_pos) {
            $('#assistant-tooltips').append('标题中HDR类型在音频编码后<br/>');
            error = true;
        }
    }

    if (title_type == type) {
        if (title_type == 1 || title_type == 8) {
            if (title_wrongBD) {
                $('#assistant-tooltips').append(`标题中${title_wrongBD}应为Blu-ray<br/>`);
                error = true;
            }
            if (mi_type == 0) {
                $('#assistant-tooltips').append('Mediainfo栏应填写BDinfo<br/>');
                error = true;
            }
            if (mi_type == 1) {
                //检查DIY和原生原盘标签
                var TagError = false;
                if (isDIY) {
                    if (!isTagDIY) {
                        $('#assistant-tooltips').append('未选择DIY标签 ');
                        TagError = true;
                    }
                    if (isTagUNTOUCHED) {
                        $('#assistant-tooltips').append('不应选择原生原盘标签 ');
                        TagError = true;
                    }
                } else {
                    if (!isTagUNTOUCHED) {
                        $('#assistant-tooltips').append('未选择原生原盘标签 ');
                        TagError = true;
                    }
                    if (isTagDIY) {
                        $('#assistant-tooltips').append('不应选择DIY标签 ');
                        TagError = true;
                    }
                }
                if (TagError) {
                    $('#assistant-tooltips').append('<br/>');
                    error = true;
                }
            }
        } else {
            if (mi_type == 1) {
                $('#assistant-tooltips').append('Mediainfo栏应填写mediainfo<br/>');
                error = true;
            }
        }
        if (title_type == 10) {
            if (title_wrongBDrip) {
                $('#assistant-tooltips').append(`标题中${title_wrongBDrip}应为BluRay<br/>`);
                error = true;
            }
        }
    }


    if (title_10bit) {
        $('#assistant-tooltips').append('标题中包含10bit<br/>');
        error = true;
    }

    // Other || SD(480 || 360)
    if ((resolution === 5 || resolution === 4 || title_resolution === 4) && !(godDramaSeed || officialSeed)){
         $('#assistant-tooltips-warning').append("请检查是否有更高清的资源<br/>");
         warning = true;
    }

    if (title_DVD720) {
        $('#assistant-tooltips-warning').append("请检查该DVD来源的资源分辨率有否错标<br/>");
         warning = true;
    }

    if (title_ES >=1  && !isTagComplete) {
        $('#assistant-tooltips').append("完结剧集请添加完结标签<br/>");
         error = true;
    }

    if (title_ES == 0  && !isTagIncomplete) {
        $('#assistant-tooltips').append("请添加分集标签<br/>");
         error = true;
    }

    if (title_ES >= 0 && title_ES < 2  && isTagCollection) {
        $('#assistant-tooltips').append("不应选择合集标签<br/>");
         error = true;
    }

    if (!dbUrl && !godDramaSeed) {
        $('#assistant-tooltips-warning').append('简介中未检测到IMDb或豆瓣链接<br/>');
        warning = true;
    }

    if(mediainfo_short === mediainfo && officialSeed == true) {
        $('#assistant-tooltips').append('媒体信息未解析<br/>');
        error = true;
    }
    if(mediainfo_short === mediainfo && officialSeed == false) {
        // $('#assistant-tooltips-warning').append('媒体信息未解析<br/>');
        // warning = true;
    }

    if(mediainfo_err) {
        $('#assistant-tooltips').append(mediainfo_err).append('<br/>');
        error = true;
    }

    if (officialSeed && !isGroupSelected) {
        $('#assistant-tooltips').append('未选择制作组<br/>');
        error = true;
    }

    //呵呵 短剧没谈拢...
    /*if (godDramaSeed && !isReseedProhibited && isBriefContainsForbidReseed) {
        $('#assistant-tooltips').append('未选择禁转标签<br/>');
        error = true;
    }
    if (godDramaSeed && cat !== 412) {
        $('#assistant-tooltips').append('未选择短剧类型<br/>');
        error = true;
    }
    if (godDramaSeed && !isTagResident) {
        $('#assistant-tooltips').append('未选择驻站标签<br/>');
        error = true;
    }*/

    if (!officialSeed && isOfficialSeedLabel) {
        $('#assistant-tooltips').append('非官种不可选择官方标签<br/>');
        error = true;
    }

    if (officialSeed && !isOfficialSeedLabel) {
        $('#assistant-tooltips').append('官种未选择官方标签<br/>');
        error = true;
    }

    if (isBriefContainsInfo) {
        $('#assistant-tooltips').append('简介中包含Mediainfo<br/>');
        error = true;
    }

    if(isAudioMandarin && !isTagAudioMandarin) {
        $('#assistant-tooltips').append('未选择国语标签<br/>');
        error = true;
    }

    if(isAudioCantonese && !isTagAudioCantonese) {
        $('#assistant-tooltips').append('未选择粤语标签<br/>');
        error = true;
    }

    if(isTextChinese && !isTagTextChinese) {
        $('#assistant-tooltips').append('未选择中字标签<br/>');
        error = true;
    }

    if(isVCBStudio && !isTagVCBStudio) {
        $('#assistant-tooltips').append('VCB资源未选择VCB-Studio标签<br/>');
        error = true;
    }

    if(isHDR && !isTagHDR) {
        $('#assistant-tooltips').append('未选择HDR标签<br/>');
        error = true;
    }
    if(isHDR10P && !isTagHDR10P) {
        $('#assistant-tooltips').append('未选择HDR10+标签<br/>');
        error = true;
    }
    if(isDV && !isTagDV) {
        $('#assistant-tooltips').append('未选择杜比视界标签<br/>');
        error = true;
    }
    if(title_type == 9 && !isTagREMUX) {
        $('#assistant-tooltips').append('未选择Remux标签<br/>');
        error = true;
    }

    if (imgCount < 1) {
        $('#assistant-tooltips').append('缺少海报或截图<br/>');
        error = true;
    }
    if (isMediainfoEmpty) {
        $('#assistant-tooltips').append('Mediainfo栏为空<br/>');
        error = true;
    } else if (mi_type == -1) {
        $('#assistant-tooltips').append('Mediainfo栏填写不正确<br/>');
        error = true;
    }

    if(mi_x264 && !title_x264 && officialSeed && category === 7){
        $('#assistant-tooltips').append('压制组-主标题中编码应为 x264<br/>');
        error = true;
    }
    if(mi_x265 && !title_x265 && officialSeed && category === 7){
        $('#assistant-tooltips').append('压制组-主标题中编码应为 x265<br/>');
        error = true;
    }

    if (officialMusicSeed) {
        $('#assistant-tooltips').empty();
        error = false;
        if (!isGroupSelected) {
            $('#assistant-tooltips').append('未选择制作组<br/>');
            error = true;
        }
    }

    if (cat === 408) {
        $('#assistant-tooltips').empty();
        error = false;
        $('#assistant-tooltips-warning').empty();
        warning = false;
    }

    if (cat === 409) {
        $('#assistant-tooltips').empty();
        error = false;
        $('#assistant-tooltips-warning').empty();
        warning = false;
    }

    if(cat === 408 && !title_lowercase.includes("khz")) {
        $('#assistant-tooltips').append('主标题缺少采样频率<br/>');
        error = true;
    }

    if(cat === 408 && !title_lowercase.includes("bit")) {
        $('#assistant-tooltips').append('主标题缺少比特率<br/>');
        error = true;
    }

    /*$('#kdescr img').each(function(index, element) {
        $(element).on('error', function (e) {
            warning = true;
            var src = $(e.target).attr('src');
            $('#assistant-tooltips-warning').append('异常图片：<a href=' + src + ' target="_blank">' + src + "</a><br/>");
            $('#assistant-tooltips-warning').show();
        });
    });*/

    var startTime = new Date().getTime();
    var intervalId = setInterval(function() {
        var allload = true;
        $('#kdescr img').each(function(index, element) {
            var src = $(element).attr('src');
            if(src != undefined) {
                var height = $(element).height();
                if (height == 0) {
                    allload = false;
                }
            }
        });
        var diff = ~~((new Date().getTime() - startTime) / 1000);
        if (diff > 30) {
            $('#assistant-tooltips-warning').append('页面图片加载30秒超时<br/>');
            window.stop()
            allload = true;
        }
        if (allload) {
            isWaitImgLoad = false;
            clearInterval(intervalId);
            $('#kdescr img').each(function(index, element) {
                var src = $(element).attr('src');
                if(src != undefined) {
                    var height = $(element).height();
                    if (height <= 24) {
                        warning = true;
                        $('#assistant-tooltips-warning').append('异常图片：<a href=' + src + ' target="_blank">' + src + "</a><br/>");
                        $('#assistant-tooltips-warning').show();
                    }
                }
            });
            if (error) {
                $('#assistant-tooltips').show();
                $('#assistant-tooltips').css('background', '#EA2027');
            } else {
                $('#assistant-tooltips').empty();
                $('#assistant-tooltips').append('此种子未检测到错误');
                $('#assistant-tooltips').css('background', '#8BC34A');
            }
            if (!warning) {
                $('#assistant-tooltips-warning').hide();
            } else {
                $('#assistant-tooltips-warning').show();
            }

            if (!error && warning) {
                $('#assistant-tooltips').hide();
            }
        }
    }, 200);


    var isFoundReviewLink = false; // 是否有审核按钮（仅有权限人员可一键填入错误信息）
    // 添加一键通过按钮到页面
    function addApproveLink() {
        var tdlist = $('#outer').find('td');
        var text;
        for (var i = 0; i < tdlist.length; i ++) {
            var td = $(tdlist[i]);

            if (td.text() == '行为') {
                var elements = td.parent().children().last();
                elements.contents().each(function() {
                    // console.log(this.textContent);
                    if (isFoundReviewLink) {
                        $(this).before(' | <a href="javascript:;" id="approvelink" class="small"><b><font><svg t="1655224943277" class="icon" viewBox="0 0 1397 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="45530" width="16" height="16"><path d="M1396.363636 121.018182c0 0-223.418182 74.472727-484.072727 372.363636-242.036364 269.963636-297.890909 381.672727-390.981818 530.618182C512 1014.690909 372.363636 744.727273 0 549.236364l195.490909-186.181818c0 0 176.872727 121.018182 297.890909 344.436364 0 0 307.2-474.763636 902.981818-707.490909L1396.363636 121.018182 1396.363636 121.018182zM1396.363636 121.018182" p-id="45531" fill="#8BC34A"></path></svg><svg t="1655224943277" class="icon" viewBox="0 0 1397 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="45530" width="16" height="16"><path d="M1396.363636 121.018182c0 0-223.418182 74.472727-484.072727 372.363636-242.036364 269.963636-297.890909 381.672727-390.981818 530.618182C512 1014.690909 372.363636 744.727273 0 549.236364l195.490909-186.181818c0 0 176.872727 121.018182 297.890909 344.436364 0 0 307.2-474.763636 902.981818-707.490909L1396.363636 121.018182 1396.363636 121.018182zM1396.363636 121.018182" p-id="45531" fill="#8BC34A"></path></svg>&nbsp;一键通过</font></b></a>'); // Add new hyperlink and separator
                        $('#addcuruser').after(' | <a href="javascript:;" id="approvelink_foot" class="small"><b><font><svg t="1655224943277" class="icon" viewBox="0 0 1397 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="45530" width="16" height="16"><path d="M1396.363636 121.018182c0 0-223.418182 74.472727-484.072727 372.363636-242.036364 269.963636-297.890909 381.672727-390.981818 530.618182C512 1014.690909 372.363636 744.727273 0 549.236364l195.490909-186.181818c0 0 176.872727 121.018182 297.890909 344.436364 0 0 307.2-474.763636 902.981818-707.490909L1396.363636 121.018182 1396.363636 121.018182zM1396.363636 121.018182" p-id="45531" fill="#8BC34A"></path></svg><svg t="1655224943277" class="icon" viewBox="0 0 1397 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="45530" width="16" height="16"><path d="M1396.363636 121.018182c0 0-223.418182 74.472727-484.072727 372.363636-242.036364 269.963636-297.890909 381.672727-390.981818 530.618182C512 1014.690909 372.363636 744.727273 0 549.236364l195.490909-186.181818c0 0 176.872727 121.018182 297.890909 344.436364 0 0 307.2-474.763636 902.981818-707.490909L1396.363636 121.018182 1396.363636 121.018182zM1396.363636 121.018182" p-id="45531" fill="#8BC34A"></path></svg>&nbsp;一键通过</font></b></a>'); // Add new hyperlink and separator

                        var actionLink = document.querySelector('#approvelink');
                        var approvelink_foot = document.querySelector('#approvelink_foot');
                        actionLink.style.fontSize = fontsize;
                        approvelink_foot.style.fontSize = fontsize;
                        actionLink.addEventListener('click', function(event) {
                            if (error) {
                                // alert("当前种子仍有错误!");
                                GM_setValue('autoFillErrorInfo', false);
                                var popup = document.createElement('div');
                                popup.id = "popup";
                                popup.style.fontSize = "20pt";
                                popup.style.position = "fixed";
                                popup.style.top = "10%";
                                popup.style.left = "10%";
                                popup.style.transform = "translate(-50%, -50%)";
                                popup.style.backgroundColor = "rgb(234, 32, 39)";
                                popup.style.color = "white";
                                popup.style.padding = "15px";
                                popup.style.borderRadius = "10px";
                                popup.style.display = "none";
                                document.body.appendChild(popup);

                                // 弹出悬浮框提示信息
                                popup.innerText = "当前种子仍有错误!";
                                popup.style.display = "block";

                                // 1秒后隐藏悬浮框
                                setTimeout(function() {
                                    popup.style.display = "none";
                                }, 1000);
                            }
                            event.preventDefault(); // 阻止超链接的默认行为
                            // 设置标记以供新页面使用
                            GM_setValue('autoCheckAndConfirm', true);
                            if (autoclose) {
                                GM_setValue('autoClose', true);
                            }
                            if (autoback) {
                                GM_setValue('autoBack', true);
                            }
                            // 找到并点击指定按钮
                            var specifiedButton = document.querySelector('#approval'); // 替换为实际的按钮选择器
                            if (specifiedButton) {
                                specifiedButton.click();
                            }
                        });
                        approvelink_foot.addEventListener('click', function(event) {
                            if (error) {
                                // alert("当前种子仍有错误!");
                                GM_setValue('autoFillErrorInfo', false);
                                var popup = document.createElement('div');
                                popup.id = "popup";
                                popup.style.fontSize = "20pt";
                                popup.style.position = "fixed";
                                popup.style.top = "10%";
                                popup.style.left = "10%";
                                popup.style.transform = "translate(-50%, -50%)";
                                popup.style.backgroundColor = "rgb(234, 32, 39)";
                                popup.style.color = "white";
                                popup.style.padding = "15px";
                                popup.style.borderRadius = "10px";
                                popup.style.display = "none";
                                document.body.appendChild(popup);

                                // 弹出悬浮框提示信息
                                popup.innerText = "当前种子仍有错误!";
                                popup.style.display = "block";

                                // 1秒后隐藏悬浮框
                                setTimeout(function() {
                                    popup.style.display = "none";
                                }, 1000);
                            }
                            event.preventDefault(); // 阻止超链接的默认行为
                            // 设置标记以供新页面使用
                            GM_setValue('autoCheckAndConfirm', true);
                            if (autoclose) {
                                GM_setValue('autoClose', true);
                            }
                            if (autoback) {
                                GM_setValue('autoBack', true);
                            }
                            // 找到并点击指定按钮
                            var specifiedButton = document.querySelector('#approval'); // 替换为实际的按钮选择器
                            if (specifiedButton) {
                                specifiedButton.click();
                            }
                        });
                        return false; // Exit the loop
                    }

                    if (this.textContent.includes('审核')) { // Check for text nodes containing the separator
                        // console.log("找到审核按钮");
                        isFoundReviewLink = true;
                    }
                });
            }
        }
    }

//     $('#assistant-tooltips').click(function(){
//         if (error && isFoundReviewLink) {
//             GM_setValue('autoFillErrorInfo', true);
//             // console.log("errorinfo_before:"+$("#approval-comment").html());
//             GM_setValue('errorInfo', document.getElementById('assistant-tooltips').innerHTML);
//             // 找到并点击指定按钮
//             var specifiedButton = document.querySelector('#approval'); // 替换为实际的按钮选择器
//             if (specifiedButton) {
//                 specifiedButton.click();
//             }
//         } else {
//             console.log("当前种子无错误或非种审人员，点击无效");
//         }
//     });

    // 主页面操作
    if (/https:\/\/.*\.agsvpt\.com\/details\.php\?id=.*/.test(window.location.href)) {
        addApproveLink();
        //console.log("autoFillErrorInfo:"+GM_getValue('autoFillErrorInfo'));
        //console.log("autoCheckAndConfirm:"+GM_getValue('autoCheckAndConfirm'));
        if (biggerbutton) {
            if (!error && isFoundReviewLink){
                // console.log("此种子未检测到错误");
                document.querySelector('#approvelink').style.fontSize = biggerbuttonsize;
                document.querySelector('#approvelink_foot').style.fontSize = biggerbuttonsize;
            } else if ((error && isFoundReviewLink)){
                document.querySelector('#approval').style.fontSize = biggerbuttonsize;
            }
        }
        if (GM_getValue('autoClose', false)){
            GM_setValue('autoClose', false);
            window.close();
        }
        if (GM_getValue('autoBack', false)){
            GM_setValue('autoBack', false);
            window.history.back();
        }
    }

    // 弹出页的操作
    if (/https:\/\/.*\.qingwapt\.com\/web\/torrent-approval-page\?torrent_id=.*/.test(window.location.href)) {
        // 使用延迟来等待页面可能的异步加载
        setTimeout(function() {
            //console.log("autoFillErrorInfo:"+GM_getValue('autoFillErrorInfo'));
            //console.log("autoCheckAndConfirm:"+GM_getValue('autoCheckAndConfirm'));
            if (GM_getValue('autoCheckAndConfirm', false)) {
                var radioPassButton = document.querySelector("body > div.form-comments > form > div:nth-child(3) > div > div:nth-child(4) > div").click();
                if (radioPassButton) {
                    radioPassButton.checked = true;
                }

                var confirmButton = document.querySelector("body > div.form-comments > form > div:nth-child(5) > div > button:nth-child(1)");
                if (confirmButton) {
                    // 完成操作后，清除标记
                    GM_setValue('autoCheckAndConfirm', false);
                    GM_setValue('autoFillErrorInfo', false);
                    confirmButton.click();
                }
            }
            if (GM_getValue('autoFillErrorInfo', false)) {
                var radioDenyButton = document.querySelector("body > div.form-comments > form > div:nth-child(3) > div > div:nth-child(6)").click();
                if (radioDenyButton) {
                    radioDenyButton.checked = true;
                }
                var errorInfo = GM_getValue('errorInfo', "");
                // console.log("errorInfo: "+errorInfo);
                errorInfo = errorInfo.replace("【错误】: ", "");
                errorInfo = errorInfo.replace("MediaInfo中含有bbcode", "请将MediaInfo中多余的标签删除，例如：[b][color=royalblue]******[/color][/b]");
                errorInfo = errorInfo.replace("简介中包含Mediainfo", "请删去简介中的MediaInfo");
                errorInfo = errorInfo.replace("媒体信息未解析", "请使用通过MediaInfo或者PotPlayer获取的正确的mediainfo信息，具体方法详见教程第四步https://www.agsvpt.com/forums.php?action=viewtopic&forumid=4&topicid=8");
                errorInfo = errorInfo.replace("简介中未检测到IMDb或豆瓣链接", "请补充imdb/豆瓣链接");
                errorInfo = errorInfo.replace("副标题为空", "请补充副标题");
                // console.log("errorInfo: "+errorInfo);
                $("#approval-comment").text(errorInfo);

                // 完成操作后，清除标记
                // GM_setValue('autoFillErrorInfo', false);
                // GM_setValue('errorInfo', "");
            }
        }, timeout); // 可能需要根据实际情况调整延迟时间
    }

    // 快捷键 ctrl+e 一键通过
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F4') {
            if(!error){
                let button = document.querySelector('#approvelink');
                button.click();
            }
            else {
                let button = document.querySelector('#approval');
                button.click();
            }
        }
        if (e.key === 'F3') {
            window.close();
        }
    });

    // 种子存在错误便设置变量
    if (error && isFoundReviewLink) {
        GM_setValue('autoFillErrorInfo', true);
        GM_setValue('errorInfo', document.getElementById('assistant-tooltips').innerHTML);
    } else if (!error) {
        GM_setValue('autoFillErrorInfo', false);
        // GM_setValue('errorInfo', "");
    }

    if (isFoundReviewLink) {
//         // 查找ID为kdescr的元素内的所有<img>元素
//         var images = document.querySelectorAll('#kdescr img');

//         // 遍历这些图片
//         images.forEach(function(img) {
//             // 获取每个图片的源链接（src属性）
//             var src = img.getAttribute('src');

//             // 创建一个新的<a>元素
//             var link = document.createElement('a');
//             // 设置<a>元素的href属性为图片的链接
//             link.setAttribute('href', src);
//             // 设置<a>标签的目标为新标签页打开
//             link.setAttribute('target', '_blank');
//             // 插入文字或说明到<a>标签中，如果需要
//             link.textContent = '打开图片链接 ( 种审用 )';

//             // 创建一个新的<br>元素用于分行
//             var breakLine1 = document.createElement('br');
//             // 将<br>元素插入到<a>元素后面
//             img.parentNode.insertBefore(breakLine1, img);
//             // 将<a>元素插入到图片元素前面
//             img.parentNode.insertBefore(link, img);
//             // link.style.color = '#EA2027';
//             // 创建一个新的<br>元素用于分行
//             var breakLine2 = document.createElement('br');
//             // 将<br>元素插入到<a>元素后面
//             img.parentNode.insertBefore(breakLine2, img);
//         });
        $('img').click(function(event) {
            // 阻止默认的点击行为
            event.preventDefault();
            // 获取图片链接
            var imageSrc = $(this).attr('src');
            // 打开图片链接
            window.open(imageSrc, '_blank');
        });
        // 为所有 <img> 元素添加鼠标移入事件监听器
        $('img').mouseenter(function() {
            // 将鼠标样式设置为手型
            $(this).css('cursor', 'pointer');
        });

        // 为所有 <img> 元素添加鼠标移出事件监听器
        $('img').mouseleave(function() {
            // 将鼠标样式恢复默认
            $(this).css('cursor', 'auto');
        });
    }

    //console.log("============================error:"+error+"isFoundReviewLink:"+isFoundReviewLink);
    //console.log("============================autoFillErrorInfo:"+GM_getValue('autoFillErrorInfo')+"errorInfo:"+GM_getValue('errorInfo'));

    if (!isWaitImgLoad) {
        if (error) {
            $('#assistant-tooltips').css('background', '#EA2027');
        } else {
            $('#assistant-tooltips').empty();
            $('#assistant-tooltips').append('此种子未检测到错误');
            $('#assistant-tooltips').css('background', '#8BC34A');
        }
        if (!warning) {
            $('#assistant-tooltips-warning').hide();
        }

        if (!error && warning) {
            $('#assistant-tooltips').hide();
        }
    } else {
        $('#assistant-tooltips').hide();
        $('#assistant-tooltips-warning').hide();
    }
    // $('#assistant-tooltips-warning').hide();
    // console.log("warning:"+warning);
})();
