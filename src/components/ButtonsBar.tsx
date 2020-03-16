import React from "react";
import { buttonStyle } from "../style/app.style";
import { Button, Spin } from "antd";
import "antd/dist/antd.css";

export interface ButtonsBarProps {
    running: boolean;
    start: () => void;
    stop: () => void;
    openTopicsModal: () => void;
    topicsModal: boolean;
}

export class ButtonsBar extends React.Component<ButtonsBarProps> {
    render() {
        return (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                    <Button
                        style={buttonStyle}
                        onClick={this.props.start}
                        disabled={this.props.running}
                        type={"primary"}
                    >
                        Start
                    </Button>
                    <Button
                        style={buttonStyle}
                        onClick={this.props.stop}
                        disabled={!this.props.running}
                        type={"danger"}
                    >
                        Stop
                    </Button>
                    {this.props.running ? <Spin style={{ marginLeft: 10 }} /> : null}
                </div>
                <div>
                    <Button
                        style={{ ...buttonStyle, marginRight: 0 }}
                        onClick={this.props.openTopicsModal}
                        disabled={this.props.topicsModal}
                        type={"primary"}
                    >
                        Add Topics
                    </Button>
                </div>
            </div>
        );
    }
}
