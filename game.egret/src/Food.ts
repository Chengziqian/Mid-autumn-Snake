class Food extends egret.Sprite{
    public color: Color;
    public intake: number;
    public FoodRadius: number;
    public food: egret.Shape;
    public id: string;
    public colornum: number;
    public constructor() {
        super();
    }
    //随机生成食物
    public CreateFood(r: number, x: number, y:number, color :number, id: string, intake: number) {
        this.id = id;
        this.intake = intake;
        this.food = new egret.Shape();
        this.color = new Color();
        this.color.Bright = this.color.BrightColor[color];
        this.color.Origin = this.color.OriginColor[color];
        this.FoodRadius = 0.2 * r * intake;
        this.food.graphics.beginFill(this.color.Origin);
        this.food.graphics.drawCircle(0,0,this.FoodRadius);
        this.food.graphics.endFill();
        this.x = x;
        this.y = y;
        this.addChild(this.food);
        let animate: egret.Tween = egret.Tween.get(this.food);
        this.food.scaleX = 0.01;
        this.food.scaleY = 0.01;
        animate.to({scaleX: 1.0, scaleY: 1.0}, 300);
    }
}