/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    "use strict";
    import ColorHelper = powerbi.extensibility.utils.color.ColorHelper;

    interface VisualNode extends DataViewTreeNode {
        selection?: powerbi.visuals.ISelectionId;
        color?: string;
    }

    export class Visual implements IVisual {
        private target: HTMLElement;
        private updateCount: number;
        private settings: VisualSettings;

        private selectionBuilder: ISelectionIdBuilder;

        private visualNode: VisualNode;
        private visualNodeList: VisualNode[];

        private host: IVisualHost;

        constructor(options: VisualConstructorOptions) {
            console.log('Visual constructor', options);
            this.target = options.element;
            this.updateCount = 0;
            this.host = options.host;
            this.selectionBuilder = options.host.createSelectionIdBuilder();
        }

        public update(options: VisualUpdateOptions) {
            debugger;
            this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
            console.log('Visual update', options);
            this.target.innerHTML = `<p>Update count: <em>${(this.updateCount++)}</em></p>`;

            let dataView: DataView = options.dataViews[0];

            if (!options
                || !options.dataViews
                || !options.dataViews[0]
                || !options.dataViews[0].matrix
                || !options.dataViews[0].matrix.rows
                || !options.dataViews[0].matrix.rows.root
                || !options.dataViews[0].matrix.rows.root.children
                || !options.dataViews[0].matrix.rows.root.children.length
                || !options.dataViews[0].matrix.columns
                || !options.dataViews[0].matrix.columns.root
                || !options.dataViews[0].matrix.columns.root.children
                || !options.dataViews[0].matrix.columns.root.children.length) {
                return;
            }
            this.visualNodeList = [];
            this.visualNode = this.processNode(options.dataViews[0].tree.root);
        }

        private processNode(node: DataViewTreeNode): VisualNode {
            let visualNode: VisualNode = node;
            if (node.identity) {
                const categoryColumn: DataViewCategoryColumn = {
                    source: {
                        displayName: node.name.toString(),
                        queryName: node.identity.key
                    },
                    values: null,
                    identity: [node.identity]
                };

                visualNode.color = (node.objects && <any>node.objects["dataPointObject"] || {color: {fill: {solid: "#FFFFFF"}}}).color.fill.solid;
                visualNode.selection = this.host.createSelectionIdBuilder().withCategory(categoryColumn, 0).createSelectionId() as powerbi.visuals.ISelectionId;
            }

            if (node.children) {
                node.children.forEach((childNode: DataViewTreeNode, index: number) => {
                    node.children[index] = this.processNode(childNode);
                });
            }
            this.visualNodeList.push(node);
            return visualNode;
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            const instanceEnumeration: VisualObjectInstanceEnumeration = VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
            if (options.objectName === "dataPointObject") {
                this.visualNodeList.forEach((node: VisualNode) => {
                    if (node.selection) {
                        let displayName = (node.name || "").toString();
                        this.addAnInstanceToEnumeration(instanceEnumeration, {
                            displayName,
                            objectName: "dataPointObject",
                            selector: ColorHelper.normalizeSelector(node.selection.getSelector(), false),
                            properties: {
                                fill: { solid: { color: node.color || "#FFFFFF" } }
                            }
                        });
                    }
                });
            }
            return instanceEnumeration;
        }
        private addAnInstanceToEnumeration(
            instanceEnumeration: VisualObjectInstanceEnumeration,
            instance: VisualObjectInstance): void {

            if ((instanceEnumeration as VisualObjectInstanceEnumerationObject).instances) {
                (instanceEnumeration as VisualObjectInstanceEnumerationObject)
                    .instances
                    .push(instance);
            } else {
                (instanceEnumeration as VisualObjectInstance[]).push(instance);
            }
        }
    }
}