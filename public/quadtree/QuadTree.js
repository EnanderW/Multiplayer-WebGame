class QuadTree {
  constructor() {
    this.rectangle = new Rectangle();
  }

  addPoint(x, y) {

    this.rectangle.addPoint(point);
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

}

class Rectangle {
  constructor(x, y, width, height) {
    this.divided = false;
    this.points = [];
  }

  addPoint(point) {
    // Check if point is inside rectangle

    if (divided) {
      this.topleft.addPoint(point);
      this.topright.addPoint(point);
      this.bottomleft.addPoint(point);
      this.bottomright.addPoint(point);
    } else {
      if (this.points.length >= 4) {
        //Divide
      } else {
        // Add the point to the list
        this.points.add(point);
      }
    }
  }
}
