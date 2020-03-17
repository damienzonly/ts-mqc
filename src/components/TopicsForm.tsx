import React from "react";
import { List, Tag, Button, Input } from "antd";
import "antd/dist/antd.css";
import { OnChangeInputTextFunction, Topics_t, AddTopicMethod, RemoveTopicMethod } from "../types/App";

export interface TopicsModalProps {
    modal_topics: boolean;
    draft_topic: string;
    topics: { [key: string]: Topics_t };
    addTopic: AddTopicMethod;
    removeTopic: RemoveTopicMethod;
    onOk: () => void;
    onCancel: () => void;
    onChange_state_draft_topic: OnChangeInputTextFunction;
}

export class TopicsForm extends React.Component<TopicsModalProps> {
    render() {
        const topics = Object.keys(this.props.topics);
        return (
            <>
                <h3> Add Topics </h3>
                <Input
                    value={this.props.draft_topic}
                    onChange={this.props.onChange_state_draft_topic}
                    onPressEnter={this.props.addTopic}
                    placeholder={"Type a topic and press enter"}
                ></Input>
                <List
                    style={{ width: "100%" }}
                    dataSource={topics}
                    renderItem={(topic: string) => {
                        return (
                            <List.Item
                                key={topic}
                                style={{
                                    display: "flex",
                                    wordBreak: "break-word",
                                    justifyContent: "space-between"
                                }}
                            >
                                {<Tag color={"purple"}>{topic}</Tag>}
                                <Button type={"danger"} onClick={() => this.props.removeTopic(topic)}>
                                    <i className="fa fa-trash" />
                                </Button>
                            </List.Item>
                        );
                    }}
                ></List>
            </>
        );
    }
}
