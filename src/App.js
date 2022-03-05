/**
 * Todo:
 * 	unsubscribe from subreddit
 * 	link to comments
 * 	support gifs/videos
 * 	add admin screen to resubscribe to unsubscribed
 * 	prevent duplicate posts
 */

import React, { Component } from "react";
import "./App.css";
import request from "request";
import Waypoint from "react-waypoint";
import store from "store";
import BottomScrollListener from "react-bottom-scroll-listener";

let viewedPosts = {};

let ignoredSubreddits = {};

let postsInStream = {};

let last = "";

const DISABLE_FILTER = false;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      posts: [],
    };
  }
  getRecent(callback) {
    let url = "https://www.reddit.com/.json?limit=100&raw_json=1";
    if (last) {
      url = `${url}&after=${last}`;
    }
    console.log("url", url);
    request(url, function (error, response, body) {
      if (error) {
        return callback(error);
      }
      if (response.statusCode !== 200) {
        return callback(
          new Error("Received status code: " + response.statusCode)
        );
      }
      var data = JSON.parse(body);
      if (
        !data ||
        !data.data ||
        !data.data.children ||
        !data.data.children.length
      ) {
        return callback(new Error("Received no data"));
      }
      callback(null, data.data.children);
    });
  }
  updatePosts() {
    this.getRecent((err, ps) => {
      if (err) {
        return console.log(err);
      }
      let posts = ps.map(({ data }) => data);
      last = posts[posts.length - 1].name;
      if (!DISABLE_FILTER) {
        posts = posts.filter(({ id, subreddit, preview }) => {
          const inStream = postsInStream[id];
          postsInStream[id] = true;
          return !viewedPosts[id] && !ignoredSubreddits[subreddit] && !inStream;
        });
      }
      if (!posts.length) {
        return this.updatePosts();
      }
      this.setState({ posts: this.state.posts.concat(posts) }, () => {
        if (this.state.posts.length < 20) {
          this.updatePosts();
        }
      });
    });
  }
  componentDidMount() {
    const p = store.get("viewedPosts");
    const i = store.get("ignoredSubreddits");
    if (p) {
      viewedPosts = p;
    }
    if (i) {
      ignoredSubreddits = i;
    }
    this.updatePosts();
  }
  getMedia({ preview, secure_media }) {
    if (!preview) {
      return null;
    }
    let videoSrc = null;

    if (
      preview.reddit_video_preview &&
      preview.reddit_video_preview.fallback_url
    ) {
      videoSrc = preview.reddit_video_preview.fallback_url;
    }

    if (
      secure_media &&
      secure_media.reddit_video &&
      secure_media.reddit_video.fallback_url
    ) {
      videoSrc = secure_media.reddit_video.fallback_url;
    }

    if (videoSrc) {
      return (
        <video width="100%" height="auto" controls>
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (preview && preview.images && preview.images[0]) {
      const i = preview.images[0];
      let imgSrc = null;

      if (i.variants && i.variants.gif) {
        imgSrc = i.variants.gif.source.url;
      } else if (i.source.url) {
        imgSrc = i.source.url;
      }
      if (imgSrc) {
        return (
          <img
            src={imgSrc}
            style={{
              maxWidth: "100%",
            }}
          />
        );
      }
    }
    return null;
  }

  handleLeave({ id, created }) {
    viewedPosts[id] = created;
    store.set("viewedPosts", viewedPosts);
  }
  handleUnsubscribe(subreddit) {
    ignoredSubreddits[subreddit] = true;
    store.set("ignoredSubreddits", ignoredSubreddits);
    // filter out posts
    this.setState({
      posts: this.state.posts.filter((p) => p.subreddit !== subreddit),
    });
  }
  render() {
    return (
      <div
        style={{
          width: "800px",
          maxWidth: "100%",
          paddingLeft: "20px",
          paddingRight: "20px",
          paddingTop: "20px",
          margin: "0 auto",
        }}
      >
        {this.state.posts.map((post) => {
          return (
            <div
              key={post.id}
              href={`https://reddit.com${post.permalink}`}
              style={{
                marginBottom: "40px",
              }}
              target="_blank"
            >
              <a
                key={post.id}
                href={`https://reddit.com${post.permalink}`}
                target="_blank"
                style={{
                  fontSize: "20px",
                  marginBottom: "10px",
                }}
              >
                {post.title}
              </a>
              <div
                style={{
                  fontSize: "12px",
                  marginBottom: "20px",
                }}
              >
                <a
                  href={post.url}
                  target="_blank"
                  style={{ marginRight: "10px" }}
                >
                  source
                </a>
                {post.subreddit}
                <button
                  onClick={() => {
                    this.handleUnsubscribe(post.subreddit);
                  }}
                  style={{
                    marginLeft: "10px",
                  }}
                >
                  unsubscribe
                </button>
                <button
                  onClick={() => {
                    console.log(post);
                  }}
                  style={{
                    marginLeft: "10px",
                  }}
                >
                  log
                </button>
              </div>
              {this.getMedia(post)}
              <Waypoint
                onLeave={() => {
                  this.handleLeave(post);
                }}
              />
            </div>
          );
        })}
        <BottomScrollListener
          offset={800}
          onBottom={() => {
            this.updatePosts();
          }}
        />
      </div>
    );
  }
}

export default App;
