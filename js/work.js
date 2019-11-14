importScripts("https://d3js.org/d3-dispatch.v1.min.js");
importScripts("https://d3js.org/d3-timer.v1.min.js");
importScripts("https://d3js.org/d3-quadtree.v1.min.js");
importScripts("https://unpkg.com/d3-binarytree");
importScripts("https://unpkg.com/d3-octree");
importScripts("https://unpkg.com/d3-force-3d");


onmessage = function (event) {
    let nodes = event.data.nodes,
        links = event.data.links;

    let simulation = d3.forceSimulation(nodes, 3)
        .force("charge", d3.forceManyBody())
        .force("link", d3.forceLink(links).distance(20).strength(1))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("z", d3.forceZ())
        .stop();

    for (let i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
        postMessage({type: "tick", progress: i / n});
        simulation.tick();
    }

    postMessage({type: "end", nodes: nodes, links: links});
    self.close();
};
