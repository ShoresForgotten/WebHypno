OUTDIR = out
all: shaders static dom webworker

dom:
	tsc -p src/ts/dom/tsconfig.json --outDir ${OUTDIR}/js

webworker:
	tsc -p src/ts/webworker/tsconfig.json --outDir ${OUTDIR}
	sed -i '$$d' ${OUTDIR}/serviceworker.js

shaders: .FORCE
	mkdir -p ${OUTDIR}/shaders
	cp -R src/shaders ${OUTDIR}

static: .FORCE
	cp -R src/static/. ${OUTDIR}

.FORCE: