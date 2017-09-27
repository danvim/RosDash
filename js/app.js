/**
 * Vue instance that wraps the dashboard element
 */
let Dashboard = new Vue({
    el: "#dashboard-root",
    data: {
        arbitraryI: 0,
        c1: {
            inner: 30,
            outer: 60,
            total: 1,
            degree: 30
        },
        s1: {
            current: 0,
            states: {
                0: {
                    text: "State 0",
                    icon: "fa-spin fa-warning",
                    rating: "off"
                },
                1: {
                    text: "State 1",
                    icon: "fa-book",
                    rating: "on"
                }
            }
        }
    },
    methods: {
        spinTestCircularIndicator: function () {
            this.arbitraryI += 0.01;
            this.c1.inner = Math.sin(this.arbitraryI);
            this.c1.outer = Math.cos(this.arbitraryI);
            requestAnimationFrame(this.spinTestCircularIndicator);
        }
    },
    mounted: function () {
        requestAnimationFrame(this.spinTestCircularIndicator);
    }
});
