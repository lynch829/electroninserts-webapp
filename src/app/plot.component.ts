import { Component, Input, OnChanges, ViewChild, AfterViewInit } from '@angular/core';

import { Coordinates } from './coordinates';

declare var Bokeh: any;

@Component({
  selector: 'my-plot',
  templateUrl: './plot.component.html',
  styleUrls: ['./plot.component.css']
})
export class PlotComponent implements OnChanges, AfterViewInit {
  @Input()
  insert: Coordinates;
  @Input()
  circle: Coordinates;
  @Input()
  ellipse: Coordinates;
  @Input()
  enabled: boolean;

  parsedJSON: any;
  tempSource: any;
  jsonValid: boolean = true;
  jsonErrorMessage: string;

  @ViewChild('bokehplot') bokehplot: any;

  plt = Bokeh.Plotting;
  tools = 'pan,crosshair,wheel_zoom,box_zoom,reset,save';
  fig = this.plt.figure({
    title: 'Electron Insert Plot', tools: this.tools,
    plot_width: 300, plot_height: 300
  });

  source = new Bokeh.ColumnDataSource();
  doc = new Bokeh.Document();


  ngOnChanges() {
    this.jsonValid = false;
    this.tempSource = {
      "xs": [[0], [0], [0]],
      "ys": [[0], [0], [0]],
      "colour": ["navy", "firebrick", "green"]
    }
    let xAll: number[] = [];
    let yAll: number[] = [];
    if (this.enabled) {
      if (this.insert) {
        if ('x' in this.insert && 'y' in this.insert) {
          this.tempSource.xs[0] = this.insert.x.concat(this.insert.x[0]);
          this.tempSource.ys[0] = this.insert.y.concat(this.insert.y[0]);
          xAll = xAll.concat(this.tempSource.xs[0]);
          yAll = yAll.concat(this.tempSource.ys[0]);
        }
      }

      if (this.circle) {
        if ('x' in this.circle && 'y' in this.circle) {
          this.tempSource.xs[1] = this.circle.x
          this.tempSource.ys[1] = this.circle.y
          xAll = xAll.concat(this.tempSource.xs[1]);
          yAll = yAll.concat(this.tempSource.ys[1]);
        }
      }
      if (this.ellipse) {
        if ('x' in this.ellipse && 'y' in this.ellipse) {
          this.tempSource.xs[2] = this.ellipse.x
          this.tempSource.ys[2] = this.ellipse.y
          xAll = xAll.concat(this.tempSource.xs[2]);
          yAll = yAll.concat(this.tempSource.ys[2]);
        }
      }
    }

    let xMax = Math.max(...xAll);
    let xMin = Math.min(...xAll);
    let yMax = Math.max(...yAll);
    let yMin = Math.min(...yAll);

    let range = Math.max(xMax - xMin, yMax - yMin) * 1.1;
    let sqXMax = (xMax + xMin) / 2 + range / 2
    let sqXMin = (xMax + xMin) / 2 - range / 2
    let sqYMax = (yMax + yMin) / 2 + range / 2
    let sqYMin = (yMax + yMin) / 2 - range / 2

    
    let xrange = Bokeh.Range1d(sqXMin, sqXMax);
    let yrange = Bokeh.Range1d(sqYMin, sqYMax);


    // Need to do something here to fix up aspect ratio

    this.source.data = this.tempSource;






    
    
  }

  ngAfterViewInit() {
    // this.ngOnChanges();
    this.fig.multi_line({ field: 'xs' }, { field: 'ys' }, {
      source: this.source,
      line_width: 2,
      color: { field: 'colour' }
    });

    this.doc.add_root(this.fig);
    Bokeh.embed.add_document_standalone(
      this.doc, this.bokehplot.nativeElement);
    

  }
}
