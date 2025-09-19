import argparse, os, torch
from diffusers import StableVideoDiffusionPipeline
from PIL import Image

def generate_video(prompt):
    # Load pipeline
    pipe = StableVideoDiffusionPipeline.from_pretrained(
        "stabilityai/stable-video-diffusion-img2vid",
        torch_dtype=torch.float16,
        variant="fp16"
    ).to("cuda")  # use "cpu" if no GPU, but slower

    # Generate initial image from prompt (can also use SD image pipeline separately)
    # Here, let’s just create a blank input for demo
    init_image = Image.new("RGB", (512, 512), (255, 255, 255))

    # Run video diffusion
    video_frames = pipe(init_image, prompt=prompt, num_frames=16).frames

    # Save output video
    out_file = "generated_video.mp4"
    import imageio
    imageio.mimsave(out_file, video_frames, fps=8)

    return out_file

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", type=str, required=True)
    args = parser.parse_args()
    video = generate_video(args.prompt)
    print(os.path.abspath(video))  # return full path
