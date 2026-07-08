// Script to generate a seed tb.json with key NT books
// Run once: node scripts/gen-bible-seed.js
// The real tb.json should be replaced with the full dataset

const fs = require('fs')
const path = require('path')

// Sample verses — a representative subset covering commonly cited references.
// Replace data/tb.json with the full Terjemahan Baru dataset for production.
const bible = {
  "Kejadian": {
    "1": {
      "1": "Pada mulanya Allah menciptakan langit dan bumi.",
      "2": "Bumi belum berbentuk dan kosong; gelap gulita menutupi samudera raya, dan Roh Allah melayang-layang di atas permukaan air.",
      "3": "Berfirmanlah Allah: \"Jadilah terang.\" Lalu terang itu jadi."
    },
    "3": {
      "16": "Firman-Nya kepada perempuan itu: \"Susah payahmu waktu mengandung akan Kubuat sangat banyak; dengan kesakitan engkau akan melahirkan anakmu; namun engkau akan berahi kepada suamimu dan ia akan berkuasa atasmu.\""
    }
  },
  "Mazmur": {
    "23": {
      "1": "TUHAN adalah gembalaku, takkan kekurangan aku.",
      "2": "Ia membaringkan aku di padang yang berumput hijau, Ia membimbing aku ke tepi air yang tenang;",
      "3": "Ia menyegarkan jiwaku. Ia menuntun aku di jalan yang benar oleh karena nama-Nya.",
      "4": "Sekalipun aku berjalan dalam lembah kekelaman, aku tidak takut bahaya, sebab Engkau besertaku; gada-Mu dan tongkat-Mu, itulah yang menghibur aku.",
      "5": "Engkau menyediakan hidangan bagiku, di hadapan lawanku; Engkau mengurapi kepalaku dengan minyak; pialaku penuh melimpah.",
      "6": "Kebajikan dan kemurahan belaka akan mengikuti aku, seumur hidupku; dan aku akan diam dalam rumah TUHAN sepanjang masa."
    },
    "119": {
      "105": "Firman-Mu itu pelita bagi kakiku dan terang bagi jalanku."
    }
  },
  "Yeremia": {
    "29": {
      "11": "Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan."
    }
  },
  "Yesaya": {
    "40": {
      "31": "tetapi orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang naik terbang dengan kekuatan sayapnya; mereka berlari dan tidak menjadi lesu, mereka berjalan dan tidak menjadi lelah."
    },
    "41": {
      "10": "janganlah takut, sebab Aku menyertai engkau, janganlah bimbang, sebab Aku ini Allahmu; Aku akan meneguhkan, bahkan akan menolong engkau; Aku akan memegang engkau dengan tangan kanan-Ku yang membawa kemenangan."
    }
  },
  "Matius": {
    "5": {
      "3": "Berbahagialah orang yang miskin di hadapan Allah, karena merekalah yang empunya Kerajaan Surga.",
      "4": "Berbahagialah orang yang berdukacita, karena mereka akan dihibur.",
      "5": "Berbahagialah orang yang lemah lembut, karena mereka akan memiliki bumi.",
      "6": "Berbahagialah orang yang lapar dan haus akan kebenaran, karena mereka akan dipuaskan.",
      "7": "Berbahagialah orang yang murah hatinya, karena mereka akan beroleh kemurahan.",
      "8": "Berbahagialah orang yang suci hatinya, karena mereka akan melihat Allah.",
      "9": "Berbahagialah orang yang membawa damai, karena mereka akan disebut anak-anak Allah."
    },
    "6": {
      "33": "Tetapi carilah dahulu Kerajaan Allah dan kebenarannya, maka semuanya itu akan ditambahkan kepadamu."
    },
    "28": {
      "19": "Karena itu pergilah, jadikanlah semua bangsa murid-Ku dan baptislah mereka dalam nama Bapa dan Anak dan Roh Kudus,",
      "20": "dan ajarlah mereka melakukan segala sesuatu yang telah Kuperintahkan kepadamu. Dan ketahuilah, Aku menyertai kamu senantiasa sampai kepada akhir zaman.\""
    }
  },
  "Markus": {
    "16": {
      "15": "Lalu Ia berkata kepada mereka: \"Pergilah ke seluruh dunia, beritakanlah Injil kepada segala makhluk.\""
    }
  },
  "Lukas": {
    "2": {
      "10": "Lalu kata malaikat itu kepada mereka: \"Jangan takut, sebab sesungguhnya aku memberitakan kepadamu kesukaan besar untuk seluruh bangsa:",
      "11": "Hari ini telah lahir bagimu Juruselamat, yaitu Kristus, Tuhan, di kota Daud."
    }
  },
  "Yohanes": {
    "1": {
      "1": "Pada mulanya adalah Firman; Firman itu bersama-sama dengan Allah dan Firman itu adalah Allah.",
      "12": "Tetapi semua orang yang menerima-Nya diberi-Nya kuasa supaya menjadi anak-anak Allah, yaitu mereka yang percaya dalam nama-Nya;",
      "14": "Firman itu telah menjadi manusia, dan diam di antara kita, dan kita telah melihat kemuliaan-Nya, yaitu kemuliaan yang diberikan kepada-Nya sebagai Anak Tunggal Bapa, penuh kasih karunia dan kebenaran."
    },
    "3": {
      "16": "Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.",
      "17": "Sebab Allah mengutus Anak-Nya ke dalam dunia bukan untuk menghakimi dunia, melainkan untuk menyelamatkannya oleh Dia."
    },
    "10": {
      "10": "Pencuri datang hanya untuk mencuri dan membunuh dan membinasakan; Aku datang, supaya mereka mempunyai hidup, dan mempunyainya dalam segala kelimpahan."
    },
    "11": {
      "25": "Kata Yesus kepadanya: \"Akulah kebangkitan dan hidup; barangsiapa percaya kepada-Ku, ia akan hidup walaupun ia sudah mati,"
    },
    "14": {
      "6": "Kata Yesus kepadanya: \"Akulah jalan dan kebenaran dan hidup. Tidak ada seorangpun yang datang kepada Bapa, kalau tidak melalui Aku.",
      "27": "Damai sejahtera Kutinggalkan bagimu. Damai sejahtera-Ku Kuberikan kepadamu, dan apa yang Kuberikan tidak seperti yang diberikan oleh dunia kepadamu. Janganlah gelisah dan gentar hatimu."
    }
  },
  "Kisah Para Rasul": {
    "1": {
      "8": "Tetapi kamu akan menerima kuasa, kalau Roh Kudus turun ke atas kamu, dan kamu akan menjadi saksi-Ku di Yerusalem dan di seluruh Yudea dan Samaria dan sampai ke ujung bumi.\""
    }
  },
  "Roma": {
    "3": {
      "23": "Karena semua orang telah berbuat dosa dan telah kehilangan kemuliaan Allah,"
    },
    "5": {
      "8": "Akan tetapi Allah menunjukkan kasih-Nya kepada kita, oleh karena Kristus telah mati untuk kita, ketika kita masih berdosa."
    },
    "6": {
      "23": "Sebab upah dosa ialah maut; tetapi karunia Allah ialah hidup yang kekal dalam Kristus Yesus, Tuhan kita."
    },
    "8": {
      "1": "Demikianlah sekarang tidak ada penghukuman bagi mereka yang ada di dalam Kristus Yesus.",
      "28": "Kita tahu sekarang, bahwa Allah turut bekerja dalam segala sesuatu untuk mendatangkan kebaikan bagi mereka yang mengasihi Dia, yaitu bagi mereka yang terpanggil sesuai dengan rencana Allah.",
      "38": "Sebab aku yakin, bahwa baik maut, maupun hidup, baik malaikat-malaikat, maupun pemerintah-pemerintah, baik yang ada sekarang, maupun yang akan datang,",
      "39": "baik yang di atas, maupun yang di bawah, ataupun sesuatu makhluk lain, tidak akan dapat memisahkan kita dari kasih Allah, yang ada dalam Kristus Yesus, Tuhan kita."
    },
    "10": {
      "9": "Sebab jika kamu mengaku dengan mulutmu, bahwa Yesus adalah Tuhan, dan percaya dalam hatimu, bahwa Allah telah membangkitkan Dia dari antara orang mati, maka kamu akan diselamatkan."
    },
    "12": {
      "2": "Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaharuan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: apa yang baik, yang berkenan kepada Allah dan yang sempurna."
    }
  },
  "1 Korintus": {
    "13": {
      "4": "Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong.",
      "5": "Ia tidak melakukan yang tidak sopan dan tidak mencari keuntungan diri sendiri. Ia tidak pemarah dan tidak menyimpan kesalahan orang lain.",
      "13": "Demikianlah tinggal ketiga hal ini, yaitu iman, pengharapan dan kasih, dan yang paling besar di antaranya ialah kasih."
    },
    "15": {
      "3": "Sebab yang sangat penting telah kusampaikan kepadamu, yaitu apa yang telah kuterima sendiri, ialah bahwa Kristus telah mati karena dosa-dosa kita, sesuai dengan Kitab Suci,",
      "4": "bahwa Ia telah dikuburkan, dan bahwa Ia telah dibangkitkan, pada hari yang ketiga, sesuai dengan Kitab Suci;"
    }
  },
  "2 Korintus": {
    "5": {
      "17": "Jadi siapa yang ada di dalam Kristus, ia adalah ciptaan baru: yang lama sudah berlalu, sesungguhnya yang baru sudah datang."
    },
    "12": {
      "9": "Tetapi jawab Tuhan kepadaku: \"Cukuplah kasih karunia-Ku bagimu, sebab justru dalam kelemahanlah kuasa-Ku menjadi sempurna.\" Sebab itu terlebih suka aku bermegah atas kelemahanku, supaya kuasa Kristus turun menaungi aku."
    }
  },
  "Galatia": {
    "2": {
      "20": "namun aku hidup, tetapi bukan lagi aku sendiri yang hidup, melainkan Kristus yang hidup di dalam aku. Dan hidupku yang kuhidupi sekarang di dalam daging, adalah hidup oleh iman dalam Anak Allah yang telah mengasihi aku dan menyerahkan diri-Nya untuk aku."
    },
    "5": {
      "22": "Tetapi buah Roh ialah: kasih, sukacita, damai sejahtera, kesabaran, kemurahan, kebaikan, kesetiaan,",
      "23": "kelemahlembutan, penguasaan diri. Tidak ada hukum yang menentang hal-hal itu."
    }
  },
  "Efesus": {
    "2": {
      "8": "Sebab karena kasih karunia kamu diselamatkan oleh iman; itu bukan hasil usahamu, tetapi pemberian Allah,",
      "9": "itu bukan hasil pekerjaanmu: jangan ada orang yang memegahkan diri.",
      "10": "Karena kita ini buatan Allah, diciptakan dalam Kristus Yesus untuk melakukan pekerjaan baik, yang dipersiapkan Allah sebelumnya. Ia mau, supaya kita hidup di dalamnya."
    },
    "6": {
      "10": "Akhirnya, hendaklah kamu kuat di dalam Tuhan, di dalam kekuatan kuasa-Nya.",
      "11": "Kenakanlah seluruh perlengkapan senjata Allah, supaya kamu dapat bertahan melawan tipu muslihat Iblis;"
    }
  },
  "Filipi": {
    "4": {
      "6": "Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.",
      "7": "Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.",
      "13": "Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku."
    }
  },
  "Kolose": {
    "3": {
      "17": "Dan segala sesuatu yang kamu lakukan dengan perkataan atau perbuatan, lakukanlah semuanya itu dalam nama Tuhan Yesus, sambil mengucap syukur oleh Dia kepada Allah, Bapa kita."
    }
  },
  "2 Timotius": {
    "3": {
      "16": "Segala tulisan yang diilhamkan Allah memang bermanfaat untuk mengajar, untuk menyatakan kesalahan, untuk memperbaiki kelakuan dan untuk mendidik orang dalam kebenaran.",
      "17": "Dengan demikian tiap-tiap manusia kepunyaan Allah diperlengkapi untuk setiap perbuatan baik."
    }
  },
  "Ibrani": {
    "11": {
      "1": "Iman adalah dasar dari segala sesuatu yang kita harapkan dan bukti dari segala sesuatu yang tidak kita lihat.",
      "6": "Tetapi tanpa iman tidak mungkin orang berkenan kepada Allah. Sebab barangsiapa berpaling kepada Allah, ia harus percaya bahwa Allah ada, dan bahwa Allah memberi upah kepada orang yang sungguh-sungguh mencari Dia."
    },
    "12": {
      "1": "Karena kita mempunyai banyak saksi, bagaikan awan yang mengelilingi kita, marilah kita menanggalkan semua beban dan dosa yang begitu merintangi kita, dan berlomba dengan tekun dalam perlombaan yang diwajibkan bagi kita.",
      "2": "Marilah kita melakukannya dengan mata yang tertuju kepada Yesus, yang memimpin kita dalam iman, dan yang membawa iman kita itu kepada kesempurnaan, yang dengan mengabaikan kehinaan tekun menanggung salib ganti sukacita yang disediakan bagi Dia, yang sekarang duduk di sebelah kanan takhta Allah."
    }
  },
  "Yakobus": {
    "1": {
      "17": "Setiap pemberian yang baik dan setiap anugerah yang sempurna, datangnya dari atas, diturunkan dari Bapa segala terang; pada-Nya tidak ada perubahan atau bayangan karena pertukaran."
    }
  },
  "1 Petrus": {
    "5": {
      "7": "Serahkanlah segala kekuatiranmu kepada-Nya, sebab Ia yang memelihara kamu."
    }
  },
  "1 Yohanes": {
    "1": {
      "9": "Jika kita mengaku dosa kita, maka Ia adalah setia dan adil, sehingga Ia akan mengampuni segala dosa kita dan menyucikan kita dari segala kejahatan."
    },
    "4": {
      "8": "Barangsiapa tidak mengasihi, ia tidak mengenal Allah, sebab Allah adalah kasih.",
      "19": "Kita mengasihi, karena Allah lebih dahulu mengasihi kita."
    }
  },
  "Wahyu": {
    "3": {
      "20": "Lihat, Aku berdiri di muka pintu dan mengetok; jikalau ada orang yang mendengar suara-Ku dan membukakan pintu, Aku akan masuk mendapatkannya dan Aku makan bersama-sama dengan dia, dan ia bersama-sama dengan Aku."
    },
    "21": {
      "4": "Dan Ia akan menghapus segala air mata dari mata mereka, dan maut tidak akan ada lagi; tidak akan ada lagi perkabungan, atau ratap tangis, atau dukacita, sebab segala sesuatu yang lama itu telah berlalu.\""
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'tb.json'),
  JSON.stringify(bible, null, 2),
  'utf8'
)
console.log('✓ data/tb.json written with', Object.keys(bible).length, 'books')
