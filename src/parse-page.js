const cheerio = require('cheerio');
function parsePage(html , url){
    const $ = cheerio.load(html);
        $("script, style").remove();

    const title = $("title").text();
    const content = $("body").text().replace(/\s+/g," ").trim();

    const links = new Set();
    const currentOrigin = new URL(url).origin;

    $("a[href]").each((index,ele)=>{
        const href = $(ele).attr("href");
        try{
        const link = new URL(href,url);
        link.hash = '';
        if(link.origin === currentOrigin) links.add(link.href);
        }
        catch(err){
            console.log("skipping invalid links:",href);
        }
    });

    return{
        document : {url, title, content},
        links : [...links]
    }
}
module.exports = parsePage;
