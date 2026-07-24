// =================================
// 网页关系网络数据核心
// =================================


// 默认数据

const DEFAULT_DATA = {

    views:{
        A:0,
        B:0,
        C:0
    },


    links:{

        "A-B":0,
        "A-C":0,

        "B-A":0,
        "B-C":0,

        "C-A":0,
        "C-B":0
    }

};




// ================================
// 获取数据
// ================================

function getNetworkData(){


    let data =
    localStorage.getItem(
        "web_network_data"
    );


    if(data){

        return JSON.parse(data);

    }


    return {

        views:{
            A:0,
            B:0,
            C:0
        },

        links:{

            "A-B":0,
            "A-C":0,

            "B-A":0,
            "B-C":0,

            "C-A":0,
            "C-B":0
        }

    };

}



// ================================
// 保存数据
// ================================

function saveNetworkData(data){


    localStorage.setItem(

        "web_network_data",

        JSON.stringify(data)

    );

}



// ================================
// 记录页面访问
// ================================

function visitPage(from,to){


    let data=getNetworkData();



    // 目标页面访问增加

    data.views[to]++;



    // 页面跳转增加

    let edge=

        from+"-"+to;



    if(data.links[edge]!==undefined){

        data.links[edge]++;

    }



    saveNetworkData(data);

}




// ================================
// PageRank
// ================================

function getPageRank(){


    let data=getNetworkData();



    let nodes=[
        "A",
        "B",
        "C"
    ];



    let rank={

        A:1/3,
        B:1/3,
        C:1/3

    };



    let damping=0.85;



    for(let i=0;i<20;i++){



        let newRank={};



        nodes.forEach(n=>{

            newRank[n]=(1-damping)/3;

        });



        nodes.forEach(from=>{


            let targets=[];



            nodes.forEach(to=>{


                if(
                    data.links[from+"-"+to]>0
                ){

                    targets.push(to);

                }


            });



            if(targets.length){


                targets.forEach(to=>{


                    newRank[to]+=

                    damping*

                    rank[from]

                    /

                    targets.length;


                });


            }



        });



        rank=newRank;


    }



    return rank;

}






// ================================
// D3需要的数据
// ================================

function getGraph(){



    let data=getNetworkData();



    return {


        nodes:[

            {
                id:"A",
                value:data.views.A
            },

            {
                id:"B",
                value:data.views.B
            },

            {
                id:"C",
                value:data.views.C
            }

        ],




        links:[


            {
                source:"A",
                target:"B",
                value:data.links["A-B"]
            },


            {
                source:"A",
                target:"C",
                value:data.links["A-C"]
            },


            {
                source:"B",
                target:"A",
                value:data.links["B-A"]
            },


            {
                source:"B",
                target:"C",
                value:data.links["B-C"]
            },


            {
                source:"C",
                target:"A",
                value:data.links["C-A"]
            },


            {
                source:"C",
                target:"B",
                value:data.links["C-B"]
            }


        ]


    };


}