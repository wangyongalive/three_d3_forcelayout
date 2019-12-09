importScripts("https://d3js.org/d3-dispatch.v1.min.js");
importScripts("https://d3js.org/d3-timer.v1.min.js");
importScripts("https://d3js.org/d3-quadtree.v1.min.js");
importScripts("https://unpkg.com/d3-binarytree");
importScripts("https://unpkg.com/d3-octree");
importScripts("https://unpkg.com/d3-force-3d");
importScripts("./lib/jLouvain.js");


onmessage = function (event) {
    let nodes = event.data.nodes,
        links = event.data.links;

    /**社区划分 开始**/
        //  将数据转变为社区发现算法需要的格式
    let node_data = nodes.map(d => d.index);
    let community = jLouvain().nodes(node_data).edges(links);
    let result = community();
    nodes.forEach(function (node) {
        node.community = result[node.index];  // 社区划分
    });

    /**社区划分 结束**/



    // 数组去重
    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    /*判断节点边界和边边界*/
    function modularityCensus(nodes, edges) {
        edges.forEach(function (edge) {
            if (edge.source.community !== edge.target.community) {
                edge.border = true;
            } else {
                edge.border = false;
            }
        });

        nodes.forEach(function (node) {
            /*与节点连接的边*/
            let theseEdges = edges.filter(function (d) {
                return d.source === node || d.target === node
            });

            let theseSourceModules = theseEdges.map(function (d) {
                return d.source.community
            }).filter(onlyUnique);

            let theseTargetModules = theseEdges.map(function (d) {
                return d.target.community
            }).filter(onlyUnique);

            // let result = [...new Set(theseTargetModules.concat(theseSourceModules))];
            //
            // // if (theseSourceModules.length > 1 || theseTargetModules.length > 1) {
            // if (result.length > 1) {
            //     node.border = true;
            // } else {
            //     node.border = false;
            // }

            if (theseSourceModules.length > 1 || theseTargetModules.length > 1) {
                node.border = true;
            } else {
                node.border = false;
            }


        });
    }


    let simulation = d3.forceSimulation(nodes, 3)
        .force("charge", d3.forceManyBody())
        .force("link", d3.forceLink(links).distance(20).strength(1))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("z", d3.forceZ())
        .stop();


    // 迭代
    for (let i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
        postMessage({type: "tick", progress: i / n});
        simulation.tick();
    }

    modularityCensus(nodes, links);

    postMessage({type: "end", nodes: nodes, links: links});
    self.close();
};
