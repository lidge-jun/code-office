use rhwp::DocumentCore;
use std::env;
use std::fs;
use std::path::PathBuf;

struct Args {
    input: PathBuf,
    output: PathBuf,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let args = parse_args(env::args().skip(1).collect())?;
    let bytes = fs::read(&args.input)
        .map_err(|error| format!("Failed to read HWP/HWPX input: {} ({error})", args.input.display()))?;
    let core = DocumentCore::from_bytes(&bytes)
        .map_err(|error| format!("Failed to parse HWP/HWPX input for PDF export: {error}"))?;
    let page_count = core.page_count();
    if page_count == 0 {
        return Err("HWP/HWPX input has no pages to export.".to_string());
    }

    let mut svg_pages = Vec::with_capacity(page_count as usize);
    for page in 0..page_count {
        let svg = core
            .render_page_svg_native(page)
            .map_err(|error| format!("Failed to render page {} as SVG: {error}", page + 1))?;
        svg_pages.push(svg);
    }

    let pdf = rhwp::renderer::pdf::svgs_to_pdf(&svg_pages)
        .map_err(|error| format!("Failed to convert HWP/HWPX SVG pages to PDF: {error}"))?;
    fs::write(&args.output, &pdf)
        .map_err(|error| format!("Failed to write PDF output: {} ({error})", args.output.display()))?;
    println!(
        "{{\"backend\":\"rhwp-native\",\"pages\":{},\"bytes\":{}}}",
        page_count,
        pdf.len()
    );
    Ok(())
}

fn parse_args(values: Vec<String>) -> Result<Args, String> {
    let mut input = None;
    let mut output = None;
    let mut index = 0;
    while index < values.len() {
        match values[index].as_str() {
            "--input" => {
                index += 1;
                input = values.get(index).map(PathBuf::from);
            }
            "--output" => {
                index += 1;
                output = values.get(index).map(PathBuf::from);
            }
            "--help" | "-h" => return Err(help()),
            value => return Err(format!("Unknown argument: {value}\n{}", help())),
        }
        index += 1;
    }

    let input = input.ok_or_else(help)?;
    let output = output.ok_or_else(help)?;
    Ok(Args { input, output })
}

fn help() -> String {
    "Usage: rhwp-pdf-export --input <file.hwp|file.hwpx> --output <file.pdf>".to_string()
}
